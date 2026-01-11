import express from 'express';
import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { loadRootEnv } from './shared/env';

loadRootEnv();

async function bootstrap() {
  const app = express();

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req }) => ({ req }),
  });

  await server.start();
  server.applyMiddleware({ app: app as any });

  const port = Number(process.env.GATEWAY_PORT || 4000);
  app.listen(port, () => console.log(`GraphQL Gateway running on :${port}${server.graphqlPath}`));
}

bootstrap().catch((e) => {
  console.error('Gateway failed to start', e);
  process.exit(1);
});
