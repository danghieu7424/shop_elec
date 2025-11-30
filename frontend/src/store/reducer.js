import * as constants from "./constants.js";

const savedCart = JSON.parse(localStorage.getItem('electro_cart')) || [];

const initState = {
  userInfo: null,
  isLogin: false,
  cart: savedCart,
  products: [],
  categories: [],
  domain: "http://localhost:5000",
  clientId: "382574203305-ud2irfgr6bl243mmq6le9l67e29ire7d.apps.googleusercontent.com", 
};

function reducer(state, action) {
  let newState;
  switch (action.type) {
    case constants.SET_IS_LOGIN:
      newState = { ...state, isLogin: action.payload };
      break;
    case constants.SET_USER_INFO:
      newState = { ...state, userInfo: action.payload, isLogin: !!action.payload };
      break;
    case constants.SET_PRODUCTS:
      newState = { ...state, products: action.payload };
      break;
    case constants.SET_CATEGORIES: // Mới
      newState = { ...state, categories: action.payload };
      break;
    case constants.ADD_TO_CART:
      const existItem = state.cart.find(item => item.id === action.payload.id);
      if (existItem) {
        newState = {
          ...state,
          cart: state.cart.map(item => 
            item.id === action.payload.id 
            ? { ...item, quantity: item.quantity + 1 } 
            : item
          )
        };
      } else {
        newState = { ...state, cart: [...state.cart, { ...action.payload, quantity: 1 }] };
      }
      break;
    case constants.REMOVE_FROM_CART:
      newState = { ...state, cart: state.cart.filter(item => item.id !== action.payload) };
      break;
    case constants.UPDATE_CART_QUANTITY:
      newState = {
        ...state,
        cart: state.cart.map(item => {
          if (item.id === action.payload.id) {
            const newQty = item.quantity + action.payload.delta;
            if (newQty < 1) return item; // Hoặc logic xóa nếu < 1
            // Logic check stock có thể xử lý ở UI hoặc server
            return { ...item, quantity: newQty };
          }
          return item;
        })
      };
      break;
    case constants.CLEAR_CART:
      newState = { ...state, cart: [] };
      break;
    default:
      throw new Error("Invalid action.");
  }
  
  if (action.type.includes('cart')) {
      localStorage.setItem('electro_cart', JSON.stringify(newState.cart));
  }
  
  return newState;
}

export { initState };
export default reducer;