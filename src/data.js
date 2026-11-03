let uid = 0;
const nid = (p) => `${p}${(++uid).toString(36)}${Date.now().toString(36).slice(-3)}`;

export const CATEGORIES = [
  { id: 'home', label: 'Home & Living', icon: 'home-outline' },
  { id: 'fashion', label: 'Fashion', icon: 'shirt-outline' },
  { id: 'beauty', label: 'Beauty', icon: 'sparkles-outline' },
  { id: 'electronics', label: 'Electronics', icon: 'headset-outline' },
  { id: 'hampers', label: 'Hampers', icon: 'gift-outline' },
  { id: 'personalized', label: 'Personalised', icon: 'color-wand-outline' },
  { id: 'jewellery', label: 'Jewellery', icon: 'diamond-outline' },
  { id: 'kids', label: 'Kids & Toys', icon: 'happy-outline' },
];

export const PRODUCTS = [
  { id: 'p1', name: 'Luxury Gift Basket', price: 850, was: 980, cat: 'hampers', retailer: 'Golden Grace Crafts', rating: 4.9, reviews: 132, desc: 'A beautifully curated gift basket featuring premium assorted treats, artisan delicacies and elegant hand-finished details.', stock: 6, variants: ['Classic', 'Deluxe'], prep: '1-2 days', a: '#B18A52', b: '#D8C3A5', icon: 'gift-sharp' },
  { id: 'p2', name: 'Scented Candle Set', price: 420, was: null, cat: 'home', retailer: 'Aroma Haus', rating: 4.8, reviews: 96, desc: 'Hand-poured soy candles in warm vanilla, sandalwood and honey scents. Set of three with woven holders.', stock: 12, variants: ['Warm set', 'Fresh set'], prep: 'Same day', a: '#C49A6C', b: '#F8F4EC', icon: 'flame-sharp' },
  { id: 'p3', name: 'Personalised Mug', price: 180, was: null, cat: 'personalized', retailer: 'Zambezi Print Co', rating: 4.7, reviews: 203, desc: 'Ceramic mug with your photo or message fired into a warm terracotta finish. A keepsake for any occasion.', stock: 30, variants: ['His', 'Hers', 'Custom'], prep: '1 day', a: '#966B4B', b: '#E8DCD0', icon: 'cafe-sharp' },
  { id: 'p4', name: 'Canvas Gift Box', price: 550, was: 620, cat: 'hampers', retailer: 'Golden Grace Crafts', rating: 4.9, reviews: 87, desc: 'Sturdy artisan canvas box lined with soft blush fabric, filled with curated local treats.', stock: 9, variants: ['Standard', 'Large'], prep: '1-2 days', a: '#70503A', b: '#D8C3A5', icon: 'archive-sharp' },
  { id: 'p5', name: 'Celebration Hamper', price: 1250, was: null, cat: 'hampers', retailer: 'Mukwa & Co', rating: 4.8, reviews: 65, desc: 'Our grandest celebration hamper: sparkling juice, dried fruit, nuts, chocolates and handwoven accents.', stock: 4, variants: ['Wedding', 'Anniversary'], prep: '2-3 days', a: '#B18A52', b: '#302821', icon: 'gift-sharp' },
  { id: 'p6', name: 'Silk Kente Square', price: 320, was: null, cat: 'fashion', retailer: 'Lusaka Atelier', rating: 4.6, reviews: 41, desc: 'Pure cotton silk square in warm gold tones, hand-rolled edges. Wearable art.', stock: 15, variants: ['Gold', 'Blush'], prep: 'Same day', a: '#D8C3A5', b: '#C49A6C', icon: 'paw-sharp' },
  { id: 'p7', name: 'Leather Wallet, Honey', price: 395, was: null, cat: 'fashion', retailer: 'Kodu Leather', rating: 4.7, reviews: 58, desc: 'Full-grain leather wallet in honey wood tones, hand-stitched. Ages beautifully.', stock: 11, variants: ['Bifold', 'Trifold'], prep: 'Same day', a: '#C49A6C', b: '#966B4B', icon: 'wallet-sharp' },
  { id: 'p8', name: 'Carved Bowls, Walnut', price: 260, was: null, cat: 'personalized', retailer: 'Kodu Leather', rating: 4.8, reviews: 77, desc: 'Set of three hand-carved wooden bowls in walnut finish. Sanded smooth, food safe.', stock: 8, variants: ['Small', 'Large'], prep: '1-2 days', a: '#966B4B', b: '#F8F4EC', icon: 'bread-sharp' },
  { id: 'p9', name: 'Brass Sun Earrings', price: 150, was: null, cat: 'jewellery', retailer: 'Mukwa & Co', rating: 4.9, reviews: 210, desc: 'Sun-shaped brass earrings, polished to a warm glow. Lightweight, hypoallergenic hooks.', stock: 25, variants: ['Sun', 'Spiral'], prep: 'Same day', a: '#B18A52', b: '#E8DCD0', icon: 'diamond-sharp' },
  { id: 'p10', name: 'Baby Welcome Box', price: 980, was: null, cat: 'kids', retailer: 'Tender Nest', rating: 4.8, reviews: 52, desc: 'Soft waffle blanket, muslin wraps, booties and a keepsake card in a memory chest.', stock: 7, variants: ['Boy', 'Girl', 'Neutral'], prep: '2 days', a: '#E8DCD0', b: '#B18A52', icon: 'heart-sharp' },
  { id: 'p11', name: 'Bass+ Wireless Headphones', price: 1250, was: 1480, cat: 'electronics', retailer: 'SoundVey', rating: 4.5, reviews: 310, desc: 'Deep bass wireless headphones with 30-hour battery in espresso finish.', stock: 5, variants: ['Espresso', 'Ivory'], prep: 'Same day', a: '#302821', b: '#D8C3A5', icon: 'headset-sharp' },
  { id: 'p12', name: 'Coffee Roasters Trio', price: 460, was: null, cat: 'home', retailer: 'Aroma Haus', rating: 4.6, reviews: 89, desc: 'Three Zambian-grown roasts: espresso, medium and honey process, whole or ground.', stock: 20, variants: ['Whole', 'Ground'], prep: 'Same day', a: '#966B4B', b: '#302821', icon: 'cafe-outline' },
];

export const SPECIALS = [
  { id: 's1', name: 'The Celebration Box', price: 1250, was: 1490, tag: 'Bestseller', a: '#B18A52', b: '#D8C3A5', icon: 'gift-sharp' },
  { id: 's2', name: 'Soft Waffle Hamper', price: 950, was: null, tag: 'Loved', a: '#C49A6C', b: '#E8DCD0', icon: 'flower-sharp' },
  { id: 's3', name: 'Luxury Tribute Box', price: 1350, was: null, tag: 'Premium', a: '#70503A', b: '#E8DCD0', icon: 'shield-checkmark-sharp' },
  { id: 's4', name: 'Baby Welcome Box', price: 980, was: 1100, tag: 'New', a: '#E8DCD0', b: '#966B4B', icon: 'heart-sharp' },
];

export const PROVIDERS = [
  { id: 'b1', name: 'Dezor Studio', type: 'Decorators & Styling', location: 'Lusaka', rating: 4.8, icon: 'color-wand-outline' },
  { id: 'b2', name: 'Lorine Royal Bakes', type: 'Cakes & Bakery', location: 'Lusaka', rating: 4.7, icon: 'nutrition-outline' },
  { id: 'b3', name: 'Lens & Light', type: 'Photography', location: 'Kitwe', rating: 4.9, icon: 'camera-outline' },
  { id: 'b4', name: 'The Cake Room', type: 'Cakes & Bakery', location: 'Harare', rating: 4.6, icon: 'nutrition-outline' },
  { id: 'b5', name: 'Sunfield Gardens', type: 'Venue & Garden', location: 'Lusaka', rating: 4.8, icon: 'leaf-outline' },
  { id: 'b6', name: 'Beat Makers DJs', type: 'Entertainment', location: 'Ndola', rating: 4.5, icon: 'musical-notes-outline' },
];

export const OCCASIONS = ['Birthday', 'Wedding', 'Kitchen Party', 'Chilanga Mulilo', 'Bridal Shower', 'Baby Shower', 'Graduation', 'Anniversary', 'Housewarming', 'Christmas', 'Other'];

export const initialState = () => ({
  user: null,
  cart: [],
  registries: [
    {
      id: 'r1', title: 'Our Wedding Registry', owner: 'Sarah & Daniel', occasion: 'Wedding',
      date: '2027-01-12', message: 'Help us build our dream home together!', coverA: '#B18A52', coverB: '#E8DCD0',
      visibility: 'link', shareToken: nid('TUYA-'), status: 'active',
      items: [
        { id: 'ri1', productId: 'p1', variant: 'Deluxe', note: '', slots: ['available'] },
        { id: 'ri2', productId: 'p3', variant: 'Hers', note: '', slots: ['purchased', 'available'] },
        { id: 'ri3', productId: 'p4', variant: 'Large', note: '', slots: ['available', 'available'] },
        { id: 'ri4', productId: 'p9', variant: 'Sun', note: '', slots: ['available', 'reserved', 'available'] },
        { id: 'ri5', productId: 'p12', variant: 'Whole', note: '', slots: ['available'] },
      ],
    },
    {
      id: 'r2', title: 'Baby Shower Registry', owner: 'Bernice Mombela', occasion: 'Baby Shower',
      date: '2026-12-11', message: 'Welcome a little ray of sunshine.', coverA: '#E8DCD0', coverB: '#D8C3A5',
      visibility: 'link', shareToken: nid('TUYA-'), status: 'active',
      items: [
        { id: 'ri6', productId: 'p10', variant: 'Neutral', note: '', slots: ['purchased'] },
        { id: 'ri7', productId: 'p2', variant: 'Warm set', note: '', slots: ['available', 'available'] },
      ],
    },
  ],
  campaigns: [
    {
      id: 'c1', title: 'Family Trip Fund', purpose: 'Family Trip', target: 5000, raised: 3200,
      deadline: '2026-12-20', a: '#C49A6C', b: '#D8C3A5', visibility: 'link',
      goals: [
        { id: 'g1', title: 'Bus + Fuel', target: 1800, raised: 1500 },
        { id: 'g2', title: 'Accommodation', target: 2000, raised: 1400 },
        { id: 'g3', title: 'Food & Supplies', target: 1200, raised: 300 },
      ],
      contributions: [
        { id: 'ct1', name: 'Jesse M', amount: 500, date: '2026-07-12', status: 'Paid', ref: nid('TX') },
        { id: 'ct2', name: 'Chanda S', amount: 500, date: '2026-10-05', status: 'Paid', ref: nid('TX') },
        { id: 'ct3', name: 'Kunda M', amount: 1000, date: '2026-06-14', status: 'Paid', ref: nid('TX') },
      ],
    },
    { id: 'c2', title: 'Ngawo for Wedding', purpose: 'Wedding', target: 15000, raised: 0, deadline: '2027-01-05', a: '#966B4B', b: '#C49A6C', visibility: 'link', goals: [], contributions: [] },
  ],
  events: [
    { id: 'e1', name: 'Bridal Shower', date: '2026-08-25', time: '14:00', venue: 'Shalata, Lusaka', budget: 8000, a: '#C49A6C', b: '#E8DCD0', status: 'upcoming', committee: [{ name: 'Chanda M', role: 'Chairperson' }, { name: 'You', role: 'Organiser' }], tasks: [], guests: 0 },
    { id: 'e2', name: 'Birthday Celebration', date: '2026-09-10', time: '16:30', venue: 'Home, Kitwe', budget: 3500, a: '#E8DCD0', b: '#B18A52', status: 'upcoming', committee: [], tasks: [], guests: 12 },
    { id: 'e3', name: 'Corporate Award Event', date: '2026-08-20', time: '10:00', venue: 'Inter-Continental Hotel, Lusaka', budget: 25000, a: '#70503A', b: '#D8C3A5', status: 'past', committee: [], tasks: [], guests: 40 },
  ],
  orders: [
    { id: 'TUYA068897', date: '2026-11-02', items: [{ name: 'Luxury Gift Basket', price: 850, qty: 1 }], shipping: 60, total: 910, status: 'In Transit', step: 1, method: 'Delivery', address: 'Riverside Drive, Lusaka' },
  ],
  notifications: [
    { id: 'n1', title: 'Someone has arranged a gift for your special day!', body: 'A guest reserved a gift on your Wedding Registry.', time: '2h', icon: 'gift-outline', unread: true, discreet: true },
    { id: 'n2', title: 'A new contribution has been received', body: 'Family Trip Fund: K500 from a contributor. Progress updated.', time: '1d', icon: 'people-outline', unread: true },
    { id: 'n3', title: 'Your order has been dispatched', body: 'Order TUYA068897 is on its way.', time: '2d', icon: 'car-outline', unread: false },
    { id: 'n4', title: 'A new event task has been assigned', body: 'Confirm catering numbers, due Friday.', time: '3d', icon: 'checkbox-outline', unread: false },
  ],
});

export { nid };
