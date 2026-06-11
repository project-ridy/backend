import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: 'src/graphql/schema.graphql',
  generates: {
    'src/graphql/generated/schema-types.ts': {
      plugins: ['typescript', 'typescript-resolvers'],
      config: {
        avoidOptionals: true,
        contextType: '../context#GraphQLContext',
        enumsAsConst: true,
        immutableTypes: true,
        maybeValue: 'T | null',
        scalars: {
          DateTime: 'Date',
        },
      },
    },
  },
};

export default config;
