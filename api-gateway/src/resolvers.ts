import axios from 'axios';
import type { Request } from 'express';

const USER_URL = `http://localhost:${process.env.USER_PORT || 3001}`;
const PRODUCT_URL = `http://localhost:${process.env.PRODUCT_PORT || 3002}`;
const ORDER_URL = `http://localhost:${process.env.ORDER_PORT || 3003}`;

function authHeader(req: Request) {
  const auth = req.headers.authorization;
  return auth ? { Authorization: auth } : {};
}

function throwCleanAxiosError(e: any, label: string): never {
  const status = e?.response?.status;
  const msg =
    e?.response?.data?.message ||
    e?.response?.data?.error ||
    e?.message ||
    'Upstream service failed';

  // Log only safe details (no req/res objects)
  console.error(`[api-gateway] ${label} failed`, {
    status,
    msg,
    url: e?.config?.url,
    method: e?.config?.method,
  });

  throw new Error(`${label} failed: ${msg}`);
}

export const resolvers = {
  Query: {
    health: () => 'ok',

    products: async (_: any, __: any, ctx: { req: Request }) => {
      try {
        const res = await axios.get(`${PRODUCT_URL}/products`, { headers: authHeader(ctx.req) });
        return res.data;
      } catch (e: any) {
        throwCleanAxiosError(e, 'products');
      }
    },
  me: async (_: any, __: any, ctx: { req: Request }) => {
  try {
    // Forward the Authorization header to user-service
    const res = await axios.get(`${USER_URL}/auth/me`, {
      headers: authHeader(ctx.req),
    });

    const u = res.data?.user ?? res.data; // support both formats
    return u ? { id: u.id || u._id, email: u.email } : null;
  } catch (e: any) {
    // return null instead of crashing
    console.error('[api-gateway] me failed', {
      status: e?.response?.status,
      msg: e?.response?.data?.message || e?.message,
      url: e?.config?.url,
    });
    return null;
  }
},


    orders: async (_: any, __: any, ctx: { req: Request }) => {
      try {
        const res = await axios.get(`${ORDER_URL}/orders`, { headers: authHeader(ctx.req) });
        return res.data;
      } catch (e: any) {
        throwCleanAxiosError(e, 'orders');
      }
    },
  },

  Mutation: {
    register: async (_: any, args: any) => {
      try {
        const res = await axios.post(`${USER_URL}/auth/register`, args);
        return res.data;
      } catch (e: any) {
        throwCleanAxiosError(e, 'register');
      }
    },

    login: async (_: any, args: any) => {
      try {
        const loginRes = await axios.post(`${USER_URL}/auth/login`, args);

        const token = loginRes.data?.token;
        const user = loginRes.data?.user;

        if (!token) throw new Error('user-service /auth/login did not return token');

        return {
          accessToken: token,
          refreshToken: loginRes.data?.refreshToken || null, // currently not implemented
          user: user
            ? {
              id: user.id || user._id,
              email: user.email,
            }
            : null,
        };
      } catch (e: any) {
        throwCleanAxiosError(e, 'login');
      }
    },


    createProduct: async (_: any, args: any, ctx: { req: Request }) => {
      try {
        const res = await axios.post(`${PRODUCT_URL}/products`, args, { headers: authHeader(ctx.req) });
        return res.data;
      } catch (e: any) {
        throwCleanAxiosError(e, 'createProduct');
      }
    },

createOrder: async (_: any, args: any, ctx: { req: Request }) => {
  const res = await axios.post(`${ORDER_URL}/orders`, args, { headers: authHeader(ctx.req) });
  return res.data;
},


  },
};
