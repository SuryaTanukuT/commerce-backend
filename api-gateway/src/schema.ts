import { gql } from 'apollo-server-express';

export const typeDefs = gql`
 type User { id: ID!, email: String! }

  type Product { id: ID!, name: String!, price: Float!, stock: Int! }

  type Order { id: ID!, userId: String!, amount: Float!, status: String! }

  type Query {
    health: String!
    me: User
    products: [Product!]!
    orders: [Order!]!
  }

  type AuthPayload {
    accessToken: String!
    refreshToken: String
    user: User
  }

  type Mutation {
    register(email: String!, password: String!): User!
    login(email: String!, password: String!): AuthPayload!
    createProduct(name: String!, price: Float!, stock: Int!): Product!
createOrder(amount: Float!): Order!
  }

`;
