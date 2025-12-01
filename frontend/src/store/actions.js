import {
  SET_IS_LOGIN,
  SET_USER_INFO,
  ADD_TO_CART,
  REMOVE_FROM_CART,
  UPDATE_CART_QUANTITY,
  CLEAR_CART,
  SET_PRODUCTS,
  SET_CATEGORIES,
  SET_CART,
} from "./constants";

export const set_is_login = (payload) => ({ type: SET_IS_LOGIN, payload });
export const set_user_info = (payload) => ({ type: SET_USER_INFO, payload });
export const add_to_cart = (payload) => ({ type: ADD_TO_CART, payload });
export const remove_from_cart = (payload) => ({ type: REMOVE_FROM_CART, payload });
export const update_cart_quantity = (payload) => ({ type: UPDATE_CART_QUANTITY, payload });
export const clear_cart = () => ({ type: CLEAR_CART });
export const set_products = (payload) => ({ type: SET_PRODUCTS, payload });
export const set_categories = (payload) => ({ type: SET_CATEGORIES, payload }); // Mới
export const set_cart = (payload) => ({ type: SET_CART, payload });