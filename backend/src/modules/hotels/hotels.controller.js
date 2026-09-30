const { Op } = require('sequelize');
const { HotelChain, Hotel, HotelBranch, City, Location } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');
const { QueryTypes } = require('sequelize');

const getCities = async (req, res, next) => {
  try {
    const cities = await City.findAll({
      where: { is_active: true },
      include: [{ model: Location, as: 'locations', where: { is_active: true }, required: false }],
      order: [['id', 'ASC'], [{ model: Location, as: 'locations' }, 'id', 'ASC']],
    });
    res.json({ success: true, data: cities });
  } catch (err) { next(err); }
};

const getLocations = async (req, res, next) => {
  try {
    const { city } = req.query;
    let cityId;
    const cityIdParam = req.params.cityId;
    if (cityIdParam || city) {
      const cityRow = cityIdParam
        ? await City.findByPk(cityIdParam)
        : await City.findOne({ where: { [Op.or]: [{ slug: city }, { name: city }] } });
      if (!cityRow) return res.json({ success: true, data: [] });
      cityId = cityRow.id;
    }
    const where = { is_active: true };
    if (cityId) where.city_id = cityId;
    const locations = await Location.findAll({
      where,
      include: [{ model: City, as: 'city', attributes: ['id', 'name', 'slug'] }],
      order: [['city_id', 'ASC'], ['id', 'ASC']],
    });
    res.json({ success: true, data: locations });
  } catch (err) { next(err); }
};

const getLocationById = async (req, res, next) => {
  try {
    const location = await Location.findByPk(req.params.locationId, {
      include: [{ model: City, as: 'city', attributes: ['id', 'name', 'slug'] }],
    });
    if (!location || !location.is_active) throw createError('Location not found', 404);
    res.json({ success: true, data: location });
  } catch (err) { next(err); }
};

const searchHotels = async (req, res, next) => {
  try {
    const { city, location, checkIn, checkOut, hotelId } = req.query;
    const guests = Number.parseInt(req.query.guests || '1', 10);
    const starRating = req.query.starRating ? Number(req.query.starRating) : null;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
    const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;

    if (!Number.isInteger(guests) || guests < 1) throw createError('guests must be a positive integer', 400);
    if ((checkIn && !checkOut) || (!checkIn && checkOut)) throw createError('checkIn and checkOut must be provided together', 400);
    if (checkIn) {
      const checkInTime = new Date(`${checkIn}T00:00:00Z`).getTime();
      const checkOutTime = new Date(`${checkOut}T00:00:00Z`).getTime();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)
        || !Number.isFinite(checkInTime) || !Number.isFinite(checkOutTime) || checkOutTime <= checkInTime) {
        throw createError('A valid check-in and check-out date range is required', 400);
      }
    }
    if ([starRating, minPrice, maxPrice].some((value) => value !== null && !Number.isFinite(value))) {
      throw createError('Search filters must be numeric', 400);
    }

    let cityRow = null;
    if (city) {
      cityRow = await City.findOne({ where: { [Op.or]: [{ slug: city }, { name: city }] } });
      if (!cityRow) return res.json({ success: true, data: [], count: 0 });
    }

    let locationRow = null;
    if (location) {
      locationRow = await Location.findOne({
        where: { is_active: true, [Op.or]: [{ slug: location }, { name: location }] },
        include: [{ model: City, as: 'city' }],
      });
      if (!locationRow) throw createError('Location not found', 404);
      if (cityRow && Number(cityRow.id) !== Number(locationRow.city_id)) {
        throw createError('Location does not belong to the selected city', 400);
      }
      if (!cityRow) cityRow = locationRow.city;
    }

    const conditions = [
      "h.status = 'Active'",
      "b.status = 'Active'",
      "r.is_active = 1",
      "r.status = 'Available'",
      'rt.max_guests >= :guests',
    ];
    const replacements = { guests };
    if (cityRow) {
      conditions.push('h.city_id = :cityId');
      replacements.cityId = cityRow.id;
    }
    if (locationRow) {
      conditions.push('hl.location_id = :locationId');
      replacements.locationId = locationRow.id;
    }
    if (hotelId) {
      const parsedHotelId = Number.parseInt(hotelId, 10);
      if (!Number.isInteger(parsedHotelId) || parsedHotelId < 1) throw createError('hotelId must be a positive integer', 400);
      conditions.push('h.id = :hotelId');
      replacements.hotelId = parsedHotelId;
    }
    if (starRating !== null) {
      conditions.push('h.star_rating >= :starRating');
      replacements.starRating = starRating;
    }
    if (minPrice !== null) {
      conditions.push('rt.base_price >= :minPrice');
      replacements.minPrice = minPrice;
    }
    if (maxPrice !== null) {
      conditions.push('rt.base_price <= :maxPrice');
      replacements.maxPrice = maxPrice;
    }
    if (checkIn && checkOut) {
      conditions.push(`NOT EXISTS (
        SELECT 1 FROM bookings booking
        WHERE booking.room_id = r.id
          AND booking.status IN ('Pending', 'Confirmed', 'CheckedIn')
          AND booking.checkin_date < :checkOut
          AND booking.checkout_date > :checkIn
      )`);
      replacements.checkIn = checkIn;
      replacements.checkOut = checkOut;
    }

    const availability = await Hotel.sequelize.query(
      `SELECT h.id AS hotel_id, COUNT(DISTINCT r.id) AS available_rooms
       FROM hotels h
       INNER JOIN cities c ON c.id = h.city_id AND c.is_active = 1
       INNER JOIN hotel_branches b ON b.hotel_id = h.id
       INNER JOIN rooms r ON r.hotel_branch_id = b.id
       INNER JOIN room_types rt ON rt.id = r.room_type_id
       ${locationRow ? 'INNER JOIN hotel_locations hl ON hl.hotel_id = h.id' : ''}
       WHERE ${conditions.join('\n         AND ')}
       GROUP BY h.id
       ORDER BY h.name ASC`,
      { replacements, type: QueryTypes.SELECT }
    );
    const availableByHotelId = new Map(availability.map((row) => [Number(row.hotel_id), Number(row.available_rooms)]));
    const hotelIds = [...availableByHotelId.keys()];
    if (!hotelIds.length) return res.json({ success: true, data: [], count: 0 });

    const hotelRows = await Hotel.findAll({
      where: { id: { [Op.in]: hotelIds } },
      include: [
        { model: HotelBranch, as: 'branches', where: { status: 'Active' }, required: false },
        {
          model: Location,
          as: 'locations',
          where: locationRow ? { id: locationRow.id } : undefined,
          required: Boolean(locationRow),
          through: { attributes: ['distance_km', 'is_primary'] },
          include: [{ model: City, as: 'city', attributes: ['id', 'name', 'slug'] }],
        },
      ],
      order: [['name', 'ASC']],
    });
    const reviewSummaries = await Hotel.sequelize.query(
      `SELECT hotel_branches.hotel_id AS hotel_id,
              COUNT(reviews.id) AS review_count,
              AVG(reviews.rating) AS average_rating
       FROM reviews
       INNER JOIN bookings ON bookings.id = reviews.booking_id
       INNER JOIN hotel_branches ON hotel_branches.id = bookings.hotel_branch_id
       WHERE reviews.is_public = 1 AND hotel_branches.hotel_id IN (:hotelIds)
       GROUP BY hotel_branches.hotel_id`,
      { replacements: { hotelIds }, type: QueryTypes.SELECT }
    );
    const reviewsByHotelId = new Map(reviewSummaries.map((row) => [Number(row.hotel_id), {
      review_count: Number(row.review_count),
      average_rating: Number(row.average_rating),
    }]));
    const hotels = hotelRows.map((hotel) => ({
      ...hotel.toJSON(),
      available_rooms: availableByHotelId.get(Number(hotel.id)) || 0,
      review_count: reviewsByHotelId.get(Number(hotel.id))?.review_count || 0,
      average_rating: reviewsByHotelId.get(Number(hotel.id))?.average_rating || null,
    }));

    res.json({
      success: true,
      data: hotels,
      count: hotels.length,
      location: locationRow ? { id: locationRow.id, name: locationRow.name, city: cityRow?.name } : null,
    });
  } catch (err) { next(err); }
};

const getChains = async (req, res, next) => {
  try {
    const chains = await HotelChain.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: chains });
  } catch (err) { next(err); }
};

const getHotels = async (req, res, next) => {
  try {
    const { chainId, city } = req.query;
    const where = {};
    if (chainId) where.hotel_chain_id = chainId;
    if (city) where.city = city;

    const hotelRows = await Hotel.findAll({
      where,
      include: [{ model: HotelBranch, as: 'branches' }],
      order: [['name', 'ASC']],
    });
    const hotelIds = hotelRows.map((hotel) => hotel.id);
    const reviewSummaries = hotelIds.length
      ? await Hotel.sequelize.query(
          `SELECT hotel_branches.hotel_id AS hotel_id,
                  COUNT(reviews.id) AS review_count,
                  AVG(reviews.rating) AS average_rating
           FROM reviews
           INNER JOIN bookings ON bookings.id = reviews.booking_id
           INNER JOIN hotel_branches ON hotel_branches.id = bookings.hotel_branch_id
           WHERE reviews.is_public = 1
             AND hotel_branches.hotel_id IN (:hotelIds)
           GROUP BY hotel_branches.hotel_id`,
          { replacements: { hotelIds }, type: QueryTypes.SELECT }
        )
      : [];
    const reviewsByHotelId = new Map(reviewSummaries.map((summary) => [
      Number(summary.hotel_id),
      { review_count: Number(summary.review_count), average_rating: Number(summary.average_rating) },
    ]));
    const hotels = hotelRows.map((hotel) => ({
      ...hotel.toJSON(),
      review_count: reviewsByHotelId.get(Number(hotel.id))?.review_count || 0,
      average_rating: reviewsByHotelId.get(Number(hotel.id))?.average_rating || null,
    }));
    res.json({ success: true, data: hotels });
  } catch (err) { next(err); }
};

const getBranches = async (req, res, next) => {
  try {
    const { hotelId, city } = req.query;
    const where = {};
    if (hotelId) where.hotel_id = hotelId;
    if (city) where.city = city;

    const branches = await HotelBranch.findAll({
      where,
      include: [{ model: Hotel, as: 'hotel' }],
      order: [['city', 'ASC'], ['name', 'ASC']],
    });
    res.json({ success: true, data: branches });
  } catch (err) { next(err); }
};

const createChain = async (req, res, next) => {
  try {
    const chain = await HotelChain.create(req.body);
    res.status(201).json({ success: true, message: 'Hotel chain created', data: chain });
  } catch (err) { next(err); }
};

const createHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.create(req.body);
    res.status(201).json({ success: true, message: 'Hotel created', data: hotel });
  } catch (err) { next(err); }
};

const createBranch = async (req, res, next) => {
  try {
    const branch = await HotelBranch.create(req.body);
    res.status(201).json({ success: true, message: 'Hotel branch created', data: branch });
  } catch (err) { next(err); }
};

module.exports = { getChains, getHotels, getBranches, getCities, getLocations, getLocationById, searchHotels, createChain, createHotel, createBranch };
