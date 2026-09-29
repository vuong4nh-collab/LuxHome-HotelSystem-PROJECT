const { HotelChain, Hotel, HotelBranch } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');
const { QueryTypes } = require('sequelize');

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

module.exports = { getChains, getHotels, getBranches, createChain, createHotel, createBranch };
