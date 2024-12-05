import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, Cocktail, Order, MenuItem } from '../types';
import { socketEmitters } from '../services/socket';
import { getOrdersByStatus, hasActiveOrder, getUserById, getCocktailById } from '../utils/orderUtils';
import { cocktails } from '../data/cocktails';

interface Store {
  user: User | null;
  users: User[];
  cocktails: Cocktail[];
  orders: Order[];
  menuItems: MenuItem[];
  setUser: (user: User | null) => void;
  setUsers: (users: User[] | ((prev: User[]) => User[])) => void;
  setOrders: (orders: Order[]) => void;
  setCocktails: (cocktails: Cocktail[]) => void;
  addOrder: (order: Order) => void;
  updateOrder: (order: Order) => void;
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  hasActiveOrder: (userId: string) => boolean;
  getOrdersByStatus: () => ReturnType<typeof getOrdersByStatus>;
  getUserById: (userId: string) => User | undefined;
  getCocktailById: (cocktailId: string) => Cocktail | undefined;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
      cocktails,
      orders: [],
      menuItems: [],
      
      setUser: (user) => {
        set((state) => ({
          ...state,
          user,
          users: user 
            ? [...state.users.filter(u => u.id !== user.id), user] 
            : state.users
        }));
        if (user) {
          socketEmitters.userLogin(user);
        }
      },

      setUsers: (users) => {
        set((state) => ({
          ...state,
          users: typeof users === 'function' ? users(state.users) : users,
        }));
      },
      
      setOrders: (orders) => {
        console.log('Setting orders:', orders);
        set((state) => ({ 
          ...state, 
          orders: orders.sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          ) 
        }));
      },
      
      setCocktails: (cocktails) => {
        set((state) => ({ ...state, cocktails }));
      },
      
      addOrder: (order) => {
        console.log('Adding new order:', order);
        socketEmitters.newOrder(order);
        
        set((state) => ({ 
          ...state, 
          orders: [order, ...state.orders].sort((a, b) => 
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          )
        }));
      },

      updateOrder: (updatedOrder) => {
        set((state) => ({
          ...state,
          orders: state.orders.map((order) =>
            order.id === updatedOrder.id ? updatedOrder : order
          ),
        }));
      },
      
      updateOrderStatus: (orderId, status) => {
        console.log('Updating order status:', orderId, status);
        socketEmitters.updateOrderStatus({ orderId, status });
        set((state) => ({
          ...state,
          orders: state.orders.map((order) =>
            order.id === orderId ? { ...order, status } : order
          ),
        }));
      },
      
      hasActiveOrder: (userId) => hasActiveOrder(get().orders, userId),
      getOrdersByStatus: () => getOrdersByStatus(get().orders),
      getUserById: (userId) => getUserById(get().users, userId),
      getCocktailById: (cocktailId) => getCocktailById(get().cocktails, cocktailId),
    }),
    {
      name: 'spiritz-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        users: state.users,
        orders: state.orders,
        cocktails: state.cocktails,
        menuItems: state.menuItems,
      }),
    }
  )
);