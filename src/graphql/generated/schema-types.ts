import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date; output: Date; }
};

/** 기업 단위 카풀 격리 단위 */
export type Company = {
  readonly __typename?: 'Company';
  readonly createdAt: Scalars['DateTime']['output'];
  readonly domain: Maybe<Scalars['String']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly inviteCode: Scalars['String']['output'];
  readonly maxMembers: Scalars['Int']['output'];
  readonly memberCount: Scalars['Int']['output'];
  readonly name: Scalars['String']['output'];
  readonly plan: CompanyPlan;
  readonly updatedAt: Scalars['DateTime']['output'];
};

/** 회사 요금제 */
export const CompanyPlan = {
  Enterprise: 'ENTERPRISE',
  Free: 'FREE',
  Pro: 'PRO'
} as const;

export type CompanyPlan = typeof CompanyPlan[keyof typeof CompanyPlan];
export type GenerateInviteCodeInput = {
  readonly expiresAt: InputMaybe<Scalars['DateTime']['input']>;
  readonly maxUses: InputMaybe<Scalars['Int']['input']>;
};

/** Ridy 백엔드 서비스 상태 */
export type Health = {
  readonly __typename?: 'Health';
  /** 서비스 식별자 */
  readonly service: Scalars['String']['output'];
  /** 서비스 가용 상태 */
  readonly status: Scalars['String']['output'];
};

/** 회사 초대 코드 */
export type InviteCode = {
  readonly __typename?: 'InviteCode';
  readonly code: Scalars['String']['output'];
  readonly company: Company;
  readonly companyId: Scalars['String']['output'];
  readonly createdAt: Scalars['DateTime']['output'];
  readonly createdBy: Scalars['String']['output'];
  readonly currentUses: Scalars['Int']['output'];
  readonly expiresAt: Maybe<Scalars['DateTime']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly isActive: Scalars['Boolean']['output'];
  readonly maxUses: Scalars['Int']['output'];
};

export type Mutation = {
  readonly __typename?: 'Mutation';
  /** 현재 관리자의 회사 초대 코드를 비활성화합니다. */
  readonly deactivateInviteCode: InviteCode;
  /** 현재 관리자의 회사에 초대 코드를 발급합니다. */
  readonly generateInviteCode: InviteCode;
};


export type MutationDeactivateInviteCodeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGenerateInviteCodeArgs = {
  input: GenerateInviteCodeInput;
};

export type Query = {
  readonly __typename?: 'Query';
  /** Ridy 백엔드 서비스 상태를 확인합니다. */
  readonly health: Health;
  /** 현재 관리자의 회사 초대 코드 목록을 조회합니다. */
  readonly inviteCodes: ReadonlyArray<InviteCode>;
  /** 가입 전 초대 코드 유효성을 검증합니다. */
  readonly validateInviteCode: InviteCode;
};


export type QueryValidateInviteCodeArgs = {
  code: Scalars['String']['input'];
};

/** 사용자 역할 */
export const Role = {
  Admin: 'ADMIN',
  Both: 'BOTH',
  Driver: 'DRIVER',
  Passenger: 'PASSENGER'
} as const;

export type Role = typeof Role[keyof typeof Role];
/** 사용자 */
export type User = {
  readonly __typename?: 'User';
  readonly companyId: Scalars['String']['output'];
  readonly createdAt: Scalars['DateTime']['output'];
  readonly email: Scalars['String']['output'];
  readonly employeeId: Maybe<Scalars['String']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly imageUrl: Maybe<Scalars['String']['output']>;
  readonly name: Scalars['String']['output'];
  readonly phone: Maybe<Scalars['String']['output']>;
  readonly phoneVerified: Scalars['Boolean']['output'];
  readonly provider: Maybe<Scalars['String']['output']>;
  readonly providerId: Maybe<Scalars['String']['output']>;
  readonly rating: Scalars['Float']['output'];
  readonly rideCount: Scalars['Int']['output'];
  readonly role: Role;
  readonly updatedAt: Scalars['DateTime']['output'];
};



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Company: ResolverTypeWrapper<Company>;
  CompanyPlan: CompanyPlan;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenerateInviteCodeInput: GenerateInviteCodeInput;
  Health: ResolverTypeWrapper<Health>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InviteCode: ResolverTypeWrapper<InviteCode>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Role: Role;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  Boolean: Scalars['Boolean']['output'];
  Company: Company;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  GenerateInviteCodeInput: GenerateInviteCodeInput;
  Health: Health;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  InviteCode: InviteCode;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  User: User;
};

export type CompanyResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Company'] = ResolversParentTypes['Company']> = {
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  domain: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  inviteCode: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  maxMembers: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  memberCount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  name: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  plan: Resolver<ResolversTypes['CompanyPlan'], ParentType, ContextType>;
  updatedAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type HealthResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Health'] = ResolversParentTypes['Health']> = {
  service: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type InviteCodeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InviteCode'] = ResolversParentTypes['InviteCode']> = {
  code: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  company: Resolver<ResolversTypes['Company'], ParentType, ContextType>;
  companyId: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  currentUses: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxUses: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  deactivateInviteCode: Resolver<ResolversTypes['InviteCode'], ParentType, ContextType, RequireFields<MutationDeactivateInviteCodeArgs, 'id'>>;
  generateInviteCode: Resolver<ResolversTypes['InviteCode'], ParentType, ContextType, RequireFields<MutationGenerateInviteCodeArgs, 'input'>>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  health: Resolver<ResolversTypes['Health'], ParentType, ContextType>;
  inviteCodes: Resolver<ReadonlyArray<ResolversTypes['InviteCode']>, ParentType, ContextType>;
  validateInviteCode: Resolver<ResolversTypes['InviteCode'], ParentType, ContextType, RequireFields<QueryValidateInviteCodeArgs, 'code'>>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  companyId: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  employeeId: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phone: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  phoneVerified: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  provider: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  providerId: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rating: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  rideCount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  updatedAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  Company: CompanyResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  Health: HealthResolvers<ContextType>;
  InviteCode: InviteCodeResolvers<ContextType>;
  Mutation: MutationResolvers<ContextType>;
  Query: QueryResolvers<ContextType>;
  User: UserResolvers<ContextType>;
};

