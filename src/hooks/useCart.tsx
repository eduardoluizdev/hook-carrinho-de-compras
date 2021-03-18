import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem(`@RocketShoes:cart`)

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });


  const addProduct = async (productId: number) => {
    try {
      const existsProductOnCart = cart.find(product => product.id === productId);

      if (existsProductOnCart) {
        const { amount } = existsProductOnCart;

        updateProductAmount({
          productId,
          amount: amount + 1
        });

        return;
      }

      const { data: stockProduct } = await api.get<Stock>(`/stock/${productId}`);

      if (stockProduct.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const { data: product } = await api.get<Product>(`/products/${productId}`);

      const newCart = [
        ...cart,
        {
          ...product,
          amount: 1,
        }
      ]

      setCart(newCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));

    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = async (productId: number) => {
    try {
      const isProductOnCart = cart.find(product => product.id === productId);

      if (isProductOnCart) {
        const newCart = cart.filter(product => product.id !== productId);

        setCart(newCart);

        localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(newCart))
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const existsProduct = cart.find(product => product.id === productId);

      if (!existsProduct) {
        throw new Error();
      }

      const { data: stockProduct } = await api.get<Stock>(`/stock/${productId}`);

      if (amount > stockProduct.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (amount < 1) return;

      const newCart = cart.map(product => (
        product.id === productId ? { ...product, amount } : product
      ))

      setCart(newCart)

      localStorage.setItem(`@RocketShoes:cart`, JSON.stringify(newCart))


    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
