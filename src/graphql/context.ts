export type CurrentUser = {
  readonly id: string;
  readonly companyId: string;
  readonly role: 'PASSENGER' | 'DRIVER' | 'BOTH' | 'ADMIN';
};

export type GraphQLContext = {
  readonly currentUser?: CurrentUser;
};
