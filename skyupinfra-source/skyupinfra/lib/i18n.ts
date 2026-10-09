export type Locale = 'en' | 'hi';

export const messages = {
  en: {
    discover: 'Discover the extraordinary', enter: 'Enter Store', skip: 'Shop normally', search: 'Search products, categories and more',
    categories: 'Explore categories', featured: 'Featured discoveries', newArrivals: 'Just arrived', viewAll: 'View all',
    home: 'Home', shop: 'Shop', orders: 'Orders', wishlist: 'Wishlist', account: 'Account', cart: 'Cart',
    addToCart: 'Add to cart', buyNow: 'Buy now', outOfStock: 'Out of stock', cod: 'Cash on Delivery', onlineSoon: 'Online payment · Coming soon',
    welcome: 'Welcome to Skyupinfra! What are you looking for today?', browse: 'A universe of useful things, all in one place.', emptyProducts: 'Your next discovery is on its way.',
    continueShopping: 'Continue exploring', subtotal: 'Subtotal', shipping: 'Shipping', total: 'Total payable', placeOrder: 'Place COD order',
    fullName: 'Full name', mobile: 'Mobile number', email: 'Email address', address: 'House no. / address', locality: 'Street / locality', city: 'Village / city',
    district: 'District', state: 'State', pin: 'PIN code', landmark: 'Landmark (optional)', instructions: 'Delivery instructions (optional)',
    signIn: 'Sign in or create account', sendOtp: 'Send OTP', verifyOtp: 'Verify OTP', emailOtp: 'Email OTP', mobileOtp: 'Mobile OTP',
    admin: 'Admin', support: 'Need help? Contact support', noProducts: 'No published products yet',
  },
  hi: {
    discover: 'कुछ असाधारण खोजें', enter: 'स्टोर में प्रवेश करें', skip: 'सीधे खरीदारी करें', search: 'उत्पाद, श्रेणियाँ और बहुत कुछ खोजें',
    categories: 'श्रेणियाँ देखें', featured: 'चुनिंदा खोजें', newArrivals: 'नए उत्पाद', viewAll: 'सभी देखें',
    home: 'होम', shop: 'खरीदारी', orders: 'ऑर्डर', wishlist: 'पसंदीदा', account: 'खाता', cart: 'कार्ट',
    addToCart: 'कार्ट में जोड़ें', buyNow: 'अभी खरीदें', outOfStock: 'स्टॉक उपलब्ध नहीं', cod: 'कैश ऑन डिलीवरी', onlineSoon: 'ऑनलाइन भुगतान · जल्द आ रहा है',
    welcome: 'Skyupinfra में आपका स्वागत है! आज आप क्या खोज रहे हैं?', browse: 'ज़रूरत की हर चीज़, एक ही जगह।', emptyProducts: 'आपकी अगली खोज जल्द आ रही है।',
    continueShopping: 'खोज जारी रखें', subtotal: 'उप-योग', shipping: 'डिलीवरी शुल्क', total: 'कुल देय राशि', placeOrder: 'COD ऑर्डर करें',
    fullName: 'पूरा नाम', mobile: 'मोबाइल नंबर', email: 'ईमेल पता', address: 'मकान नंबर / पता', locality: 'गली / क्षेत्र', city: 'गाँव / शहर',
    district: 'ज़िला', state: 'राज्य', pin: 'पिन कोड', landmark: 'लैंडमार्क (वैकल्पिक)', instructions: 'डिलीवरी निर्देश (वैकल्पिक)',
    signIn: 'लॉगिन करें या खाता बनाएँ', sendOtp: 'OTP भेजें', verifyOtp: 'OTP सत्यापित करें', emailOtp: 'ईमेल OTP', mobileOtp: 'मोबाइल OTP',
    admin: 'एडमिन', support: 'मदद चाहिए? सहायता से संपर्क करें', noProducts: 'अभी कोई प्रकाशित उत्पाद नहीं है',
  }
} as const;

export function getLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  return window.localStorage.getItem('skyupinfra-locale') === 'hi' ? 'hi' : 'en';
}
