import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Result,
  Err,
  Ok,
  nat64,
  bool,
  Vec,
  Null,
  Canister,
  ic,
  Opt,
} from "azle";
import { v4 as uuidv4 } from "uuid";

// Define BookingStatusEnum
enum BookingStatusEnum {
  Pending = "Pending",
  Confirmed = "Confirmed",
  Canceled = "Canceled",
  Completed = "Completed",
}

// Define the ServiceProvider struct
const ServiceProvider = Record({
  id: text,
  name: text,
  service_type: text,
  contact_info: text,
  createdAt: nat64,
  average_rating: nat64,
  reviews: Vec(
    Record({ clientId: text, rating: nat64, comment: text, createdAt: nat64 })
  ),
  availability: Vec(nat64),
});

// Define the Client struct
const Client = Record({
  id: text,
  name: text,
  contact_info: text,
});

// Define the Booking struct
const Booking = Record({
  id: text,
  service_provider_id: text,
  client_id: text,
  service_date: nat64,
  service_type: text,
  status: text,
  createdAt: nat64,
});

// Define the Review struct
const Review = Record({
  client_id: text,
  rating: nat64,
  comment: text,
  createdAt: nat64,
});

// Payloads for the Service Provider, Booking, Client, and Review
const ServiceProviderPayload = Record({
  name: text,
  service_type: text,
  contact_info: text,
  availability: Vec(nat64),
});

const BookingPayload = Record({
  service_provider_id: text,
  client_id: text,
  service_date: nat64,
  service_type: text,
});

const ClientPayload = Record({
  name: text,
  contact_info: text,
});

const ReviewPayload = Record({
  booking_id: text,
  rating: nat64,
  comment: text,
});

// Stable Maps
const serviceProviderStorage = StableBTreeMap(0, text, ServiceProvider);
const bookingStorage = StableBTreeMap(1, text, Booking);
const clientStorage = StableBTreeMap(2, text, Client);

// Canister definition
export default Canister({
  // Create a new service provider
  createServiceProvider: update(
    [ServiceProviderPayload],
    Result(ServiceProvider, text),
    (payload) => {
      if (!payload.name || !payload.service_type || !payload.contact_info) {
        return Err(
          "Ensure 'name', 'service_type', and 'contact_info' are provided."
        );
      }
  
      const id = uuidv4();
      const serviceProvider = {
        id,
        name: payload.name,
        service_type: payload.service_type,
        contact_info: payload.contact_info,
        createdAt: ic.time(),
        average_rating: 0n,
        reviews: [],
        availability: payload.availability,  // Ensure this matches Vec(nat64)
      };
  
      serviceProviderStorage.insert(id, serviceProvider);
      return Ok(serviceProvider);
    }
  ),
  

  // Create a new booking
  createBooking: update([BookingPayload], Result(Booking, text), (payload) => {
    const serviceProviderOpt = serviceProviderStorage.get(
      payload.service_provider_id
    );
    if ("None" in serviceProviderOpt) {
      return Err("Invalid service provider.");
    }

    const serviceProvider = serviceProviderOpt.Some;
    if (!serviceProvider.availability.includes(payload.service_date)) {
      return Err("Service provider is not available on the selected date.");
    }

    const id = uuidv4();
    const booking = {
      id,
      service_provider_id: payload.service_provider_id,
      client_id: payload.client_id,
      service_date: payload.service_date,
      service_type: payload.service_type,
      status: BookingStatusEnum.Pending,
      createdAt: ic.time(),
    };

    bookingStorage.insert(id, booking);
    return Ok(booking);
  }),

  // Reschedule a booking
  rescheduleBooking: update(
    [text, nat64],
    Result(Null, text),
    (bookingId, newDate) => {
      const bookingOpt = bookingStorage.get(bookingId);
      if ("None" in bookingOpt) {
        return Err("Booking not found.");
      }

      const booking = bookingOpt.Some;
      if (booking.status !== BookingStatusEnum.Pending) {
        return Err("Only pending bookings can be rescheduled.");
      }

      const serviceProviderOpt = serviceProviderStorage.get(
        booking.service_provider_id
      );
      if ("None" in serviceProviderOpt) {
        return Err("Service provider not found.");
      }

      const serviceProvider = serviceProviderOpt.Some;
      if (!serviceProvider.availability.includes(newDate)) {
        return Err("Service provider is not available on the new date.");
      }

      booking.service_date = newDate;
      bookingStorage.insert(bookingId, booking);
      return Ok(null);
    }
  ),

// Add a review for a completed booking
addReview: update([ReviewPayload], Result(Null, text), (payload) => {
  const bookingOpt = bookingStorage.get(payload.booking_id);
  if ("None" in bookingOpt) {
    return Err("Booking not found.");
  }

  const booking = bookingOpt.Some;
  if (booking.status !== BookingStatusEnum.Completed) {
    return Err("Only completed bookings can be reviewed.");
  }

  const review = {
    client_id: booking.client_id,
    rating: payload.rating,
    comment: payload.comment,
    createdAt: ic.time(),
  };

  const serviceProviderOpt = serviceProviderStorage.get(
    booking.service_provider_id
  );
  if ("None" in serviceProviderOpt) {
    return Err("Service provider not found.");
  }

  const serviceProvider = serviceProviderOpt.Some;
  serviceProvider.reviews.push(review);

  // Explicitly type sum as bigint and r as the review object
  const totalRatings = serviceProvider.reviews.reduce(
    (sum: bigint, r: { clientId: string; rating: bigint; comment: string; createdAt: bigint }) => sum + r.rating, 
    0n  // Start sum with a bigint value
  );
  
  serviceProvider.average_rating = totalRatings / BigInt(serviceProvider.reviews.length);

  serviceProviderStorage.insert(serviceProvider.id, serviceProvider);
  return Ok(null);
}),


  // Create a new client
  createClient: update([ClientPayload], Result(Client, text), (payload) => {
    if (!payload.name || !payload.contact_info) {
      return Err("Ensure 'name' and 'contact_info' are provided.");
    }

    const id = uuidv4();
    const client = {
      id,
      name: payload.name,
      contact_info: payload.contact_info,
    };

    clientStorage.insert(id, client);
    return Ok(client);
  }),

  // Get service provider booking history
  getServiceProviderHistory: query(
    [text],
    Result(Vec(Booking), text),
    (serviceProviderId) => {
      const bookings = bookingStorage
        .values()
        .filter((booking) => booking.service_provider_id === serviceProviderId);

      if (bookings.length === 0) {
        return Err("No bookings found for this service provider.");
      }
      return Ok(bookings);
    }
  ),
});
