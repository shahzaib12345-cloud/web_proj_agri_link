export type UserRole = 'farmer' | 'buyer' | 'admin';
export type BuyerType = 'wholesaler' | 'retailer' | 'processor' | 'individual';

export interface User {
  id: string;
  phone: string;
  name: string;
  role: UserRole;
  location: { district: string; tehsil: string; village: string };
  cropsGrown: string[];
  farmSizeAcres?: number;
  buyerType?: BuyerType;
  isVerified: boolean;
  rating?: number;
  reviewsCount?: number;
  joinedDate: string;
  avatarUrl?: string;
}

/** Mock-only: the real API never returns a password. */
export interface StoredUser extends User {
  password: string;
}

export type ProduceUnit =
  'Maund (40 kg / من)' | 'Bori (50 kg / بوری)' | 'Crate (پیٹی)' | 'kg (کلو)';
export type ProduceCategory =
  'Cereals & Grains' | 'Vegetables' | 'Tubers & Roots' | 'Legumes' | 'Fruits';
export type ListingStatus = 'active' | 'pending_offer' | 'sold';

export interface ProduceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerLocation: { district: string; tehsil: string };
  cropName: string;
  variety: string;
  category: ProduceCategory;
  quantity: number;
  unit: ProduceUnit;
  pricePerUnit: number;
  currency: string;
  minOrderQuantity: number;
  harvestDate: string;
  availableUntil: string;
  description: string;
  imageUrl: string;
  /** Added by the server on public reads. */
  farmerRating?: number;
  farmerReviews?: number;
  farmerVerified?: boolean;
  status: ListingStatus;
  isModerated: boolean;
  createdAt: string;
}

/** Fields a farmer may send when creating a listing. The server derives everything else. */
export type NewListingInput = Pick<
  ProduceListing,
  | 'cropName'
  | 'variety'
  | 'category'
  | 'quantity'
  | 'unit'
  | 'pricePerUnit'
  | 'minOrderQuantity'
  | 'harvestDate'
  | 'availableUntil'
  | 'description'
  | 'imageUrl'
>;

export type OfferStatus = 'pending' | 'accepted' | 'rejected' | 'countered' | 'completed';
export type OfferAction = 'accept' | 'reject' | 'counter' | 'complete';

export interface BuyerOffer {
  id: string;
  listingId: string;
  cropName: string;
  farmerId: string;
  farmerName: string;
  /** Only filled by the server once the offer is accepted/completed. */
  farmerPhone: string;
  buyerId: string;
  buyerName: string;
  /** Only filled by the server once the offer is accepted/completed. */
  buyerPhone: string;
  offeredPricePerUnit: number;
  listingPricePerUnit: number;
  quantity: number;
  unit: ProduceUnit;
  totalPrice: number;
  message: string;
  status: OfferStatus;
  counterPricePerUnit?: number;
  counterNote?: string;
  createdAt: string;
  completedAt?: string;
  ratingGiven?: number;
  reviewComment?: string;
}

export interface NewOfferInput {
  listingId: string;
  quantity: number;
  offeredPricePerUnit: number;
  message: string;
}

export interface HistoricalPricePoint {
  date: string;
  price: number;
}

export interface MarketPrice {
  id: string;
  cropName: string;
  marketName: string;
  region: string;
  wholesalePrice: number;
  retailPrice: number;
  unit: ProduceUnit;
  currency: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  historicalPrices: HistoricalPricePoint[];
  /** ISO 8601 timestamp. */
  lastUpdated: string;
}

export interface PriceAlert {
  id: string;
  userId: string;
  cropName: string;
  targetPrice: number;
  condition: 'above' | 'below';
  isTriggered: boolean;
  createdAt: string;
}

export type WeatherCondition =
  'Sunny' | 'Partly Cloudy' | 'Scattered Showers' | 'Heavy Rain' | 'Overcast';

export interface WeatherDay {
  /** ISO date, YYYY-MM-DD. */
  date: string;
  tempMax: number;
  tempMin: number;
  condition: WeatherCondition;
  rainProbPercent: number;
  humidityPercent: number;
  windSpeedKmh: number;
  advisory: string;
}

export type ArticleCategory =
  'Planting Calendars' | 'Pest & Disease Control' | 'Soil Fertility' | 'Post-Harvest Storage';

export interface Article {
  id: string;
  title: string;
  category: ArticleCategory;
  cropTag: string;
  author: string;
  readTimeMin: number;
  publishedDate: string;
  summary: string;
  /** Plain-text paragraphs. Never render as HTML. */
  content: string[];
  keyRecommendations: string[];
}

export interface RegisterInput {
  phone: string;
  password: string;
  name: string;
  role: Exclude<UserRole, 'admin'>;
  district: string;
  tehsil: string;
  village: string;
  cropsGrown?: string[];
  farmSizeAcres?: number;
  buyerType?: BuyerType;
}

export interface Session {
  accessToken: string;
  expiresIn: number;
  user: User;
}

export interface AdminStats {
  farmers: number;
  buyers: number;
  activeListings: number;
  completedOffers: number;
  completedValue: number;
  pendingVerifications: number;
}
