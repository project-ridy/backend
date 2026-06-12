import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '../../common/context/graphql-context';
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
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
};

export type AuthPayload = {
  readonly __typename?: 'AuthPayload';
  readonly accessToken: Scalars['String']['output'];
  readonly refreshToken: Scalars['String']['output'];
  readonly user: User;
};

export type CalculateFareInput = {
  readonly arrival: LatLngInput;
  readonly departure: LatLngInput;
  readonly passengers: InputMaybe<Scalars['Int']['input']>;
};

export type ChatRoom = {
  readonly __typename?: 'ChatRoom';
  readonly createdAt: Scalars['DateTime']['output'];
  readonly id: Scalars['ID']['output'];
  readonly lastMessage: Maybe<Message>;
  readonly ride: Ride;
  readonly unreadCount: Scalars['Int']['output'];
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
export type CreateReviewInput = {
  readonly comment: InputMaybe<Scalars['String']['input']>;
  readonly rating: Scalars['Int']['input'];
  readonly rideId: Scalars['ID']['input'];
  readonly toUserId: Scalars['ID']['input'];
};

export type CreateRideInput = {
  readonly arrival: LatLngInput;
  readonly arrivalAddr: InputMaybe<Scalars['String']['input']>;
  readonly availableSeats: Scalars['Int']['input'];
  readonly departure: LatLngInput;
  readonly departureAddr: InputMaybe<Scalars['String']['input']>;
  readonly departureTime: Scalars['DateTime']['input'];
  readonly fare: InputMaybe<Scalars['Int']['input']>;
  readonly preferences: InputMaybe<Scalars['JSON']['input']>;
};

/** 내부 의존성 상태 */
export type DependencyHealth = {
  readonly __typename?: 'DependencyHealth';
  readonly latencyMs: Maybe<Scalars['Int']['output']>;
  readonly message: Maybe<Scalars['String']['output']>;
  readonly status: Scalars['String']['output'];
};

export type EsgReport = {
  readonly __typename?: 'EsgReport';
  readonly co2SavedKg: Scalars['Float']['output'];
  readonly participantCount: Scalars['Int']['output'];
  readonly period: Scalars['String']['output'];
  readonly totalDistanceKm: Scalars['Float']['output'];
  readonly totalRides: Scalars['Int']['output'];
};

export type FareCalculation = {
  readonly __typename?: 'FareCalculation';
  readonly baseFare: Scalars['Int']['output'];
  readonly companySubsidy: Scalars['Int']['output'];
  readonly distanceKm: Scalars['Float']['output'];
  readonly driverAmount: Scalars['Int']['output'];
  readonly passengerAmount: Scalars['Int']['output'];
  readonly platformFee: Scalars['Int']['output'];
};

export type GenerateInviteCodeInput = {
  readonly expiresAt: InputMaybe<Scalars['DateTime']['input']>;
  readonly maxUses: InputMaybe<Scalars['Int']['input']>;
};

/** Ridy 백엔드 서비스 상태 */
export type Health = {
  readonly __typename?: 'Health';
  readonly database: DependencyHealth;
  readonly redis: DependencyHealth;
  /** 서비스 식별자 */
  readonly service: Scalars['String']['output'];
  /** 서비스 가용 상태 */
  readonly status: Scalars['String']['output'];
  readonly timestamp: Scalars['DateTime']['output'];
  readonly uptimeSec: Scalars['Int']['output'];
};

/** 회사 초대 코드 */
export type InviteCode = {
  readonly __typename?: 'InviteCode';
  readonly code: Scalars['String']['output'];
  readonly company: Company;
  readonly companyId: Scalars['ID']['output'];
  readonly createdAt: Scalars['DateTime']['output'];
  readonly createdBy: Scalars['ID']['output'];
  readonly currentUses: Scalars['Int']['output'];
  readonly expiresAt: Maybe<Scalars['DateTime']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly isActive: Scalars['Boolean']['output'];
  readonly maxUses: Scalars['Int']['output'];
};

export type InviteCodeConnection = {
  readonly __typename?: 'InviteCodeConnection';
  readonly nodes: ReadonlyArray<InviteCode>;
  readonly pageInfo: PageInfo;
};

export type JoinWithInviteCodeInput = {
  readonly employeeId: InputMaybe<Scalars['String']['input']>;
  readonly inviteCode: Scalars['String']['input'];
  readonly oauthToken: Scalars['String']['input'];
  readonly provider: Scalars['String']['input'];
};

/** 위경도 좌표 */
export type LatLng = {
  readonly __typename?: 'LatLng';
  readonly lat: Scalars['Float']['output'];
  readonly lng: Scalars['Float']['output'];
};

export type LatLngInput = {
  readonly lat: Scalars['Float']['input'];
  readonly lng: Scalars['Float']['input'];
};

export type LoginInput = {
  readonly oauthToken: Scalars['String']['input'];
  readonly provider: Scalars['String']['input'];
};

export type MemberConnection = {
  readonly __typename?: 'MemberConnection';
  readonly nodes: ReadonlyArray<User>;
  readonly pageInfo: PageInfo;
};

export type Message = {
  readonly __typename?: 'Message';
  readonly content: Scalars['String']['output'];
  readonly createdAt: Scalars['DateTime']['output'];
  readonly id: Scalars['ID']['output'];
  readonly roomId: Scalars['ID']['output'];
  readonly sender: User;
  readonly type: MessageType;
};

export type MessageConnection = {
  readonly __typename?: 'MessageConnection';
  readonly nodes: ReadonlyArray<Message>;
  readonly pageInfo: PageInfo;
};

/** 메시지 타입 */
export const MessageType = {
  Image: 'IMAGE',
  System: 'SYSTEM',
  Text: 'TEXT'
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];
export type Mutation = {
  readonly __typename?: 'Mutation';
  readonly acceptRideRequest: Maybe<RideRequest>;
  readonly cancelRide: Maybe<Ride>;
  readonly cancelRideRequest: Maybe<RideRequest>;
  readonly createReview: Maybe<Review>;
  readonly createRide: Maybe<Ride>;
  /** 현재 관리자의 회사 초대 코드를 비활성화합니다. */
  readonly deactivateInviteCode: InviteCode;
  readonly deletePaymentMethod: Maybe<Scalars['Boolean']['output']>;
  /** 차량을 삭제합니다. */
  readonly deleteVehicle: Maybe<Scalars['Boolean']['output']>;
  /** 현재 관리자의 회사에 초대 코드를 발급합니다. */
  readonly generateInviteCode: InviteCode;
  readonly joinWithInviteCode: Maybe<AuthPayload>;
  readonly login: Maybe<AuthPayload>;
  readonly paySettlement: Maybe<Settlement>;
  readonly refreshToken: Maybe<AuthPayload>;
  readonly registerPaymentMethod: Maybe<PaymentMethod>;
  /** 차량을 등록합니다. */
  readonly registerVehicle: Maybe<Vehicle>;
  readonly rejectRideRequest: Maybe<RideRequest>;
  readonly requestRide: Maybe<RideRequest>;
  readonly updateProfile: Maybe<User>;
  readonly updateRide: Maybe<Ride>;
  /** 차량 정보를 수정합니다. */
  readonly updateVehicle: Maybe<Vehicle>;
};


export type MutationAcceptRideRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelRideArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCancelRideRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationCreateReviewArgs = {
  input: CreateReviewInput;
};


export type MutationCreateRideArgs = {
  input: CreateRideInput;
};


export type MutationDeactivateInviteCodeArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeletePaymentMethodArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteVehicleArgs = {
  id: Scalars['ID']['input'];
};


export type MutationGenerateInviteCodeArgs = {
  input: GenerateInviteCodeInput;
};


export type MutationJoinWithInviteCodeArgs = {
  input: JoinWithInviteCodeInput;
};


export type MutationLoginArgs = {
  input: LoginInput;
};


export type MutationPaySettlementArgs = {
  idempotencyKey: Scalars['String']['input'];
  settlementId: Scalars['ID']['input'];
};


export type MutationRefreshTokenArgs = {
  token: Scalars['String']['input'];
};


export type MutationRegisterPaymentMethodArgs = {
  input: RegisterPaymentMethodInput;
};


export type MutationRegisterVehicleArgs = {
  input: RegisterVehicleInput;
};


export type MutationRejectRideRequestArgs = {
  id: Scalars['ID']['input'];
};


export type MutationRequestRideArgs = {
  input: RequestRideInput;
};


export type MutationUpdateProfileArgs = {
  input: UpdateProfileInput;
};


export type MutationUpdateRideArgs = {
  id: Scalars['ID']['input'];
  input: CreateRideInput;
};


export type MutationUpdateVehicleArgs = {
  id: Scalars['ID']['input'];
  input: UpdateVehicleInput;
};

/** 페이지 정보 */
export type PageInfo = {
  readonly __typename?: 'PageInfo';
  readonly endCursor: Maybe<Scalars['String']['output']>;
  readonly hasNextPage: Scalars['Boolean']['output'];
};

export type PaginationInput = {
  readonly after: InputMaybe<Scalars['String']['input']>;
  readonly first: InputMaybe<Scalars['Int']['input']>;
};

export type PaymentMethod = {
  readonly __typename?: 'PaymentMethod';
  readonly alias: Maybe<Scalars['String']['output']>;
  readonly createdAt: Scalars['DateTime']['output'];
  readonly id: Scalars['ID']['output'];
  readonly isDefault: Scalars['Boolean']['output'];
  readonly type: PaymentType;
};

/** 결제수단 타입 */
export const PaymentType = {
  Card: 'CARD',
  KakaoPay: 'KAKAO_PAY',
  TossPay: 'TOSS_PAY'
} as const;

export type PaymentType = typeof PaymentType[keyof typeof PaymentType];
export type Query = {
  readonly __typename?: 'Query';
  readonly calculateFare: Maybe<FareCalculation>;
  readonly chatRooms: ReadonlyArray<ChatRoom>;
  readonly companyEsgReport: Maybe<EsgReport>;
  readonly companyMembers: Maybe<MemberConnection>;
  readonly companyUsageStat: Maybe<UsageStat>;
  /** Ridy 백엔드 서비스 상태를 확인합니다. */
  readonly health: Health;
  /** 현재 관리자의 회사 초대 코드 목록을 조회합니다. */
  readonly inviteCodes: ReadonlyArray<InviteCode>;
  /** 현재 로그인 사용자를 조회합니다. */
  readonly me: Maybe<User>;
  readonly messages: Maybe<MessageConnection>;
  /** 현재 사용자의 회사를 조회합니다. */
  readonly myCompany: Maybe<Company>;
  readonly myPaymentMethods: ReadonlyArray<PaymentMethod>;
  readonly myRideRequests: ReadonlyArray<RideRequest>;
  readonly myRides: Maybe<RideConnection>;
  readonly mySettlements: ReadonlyArray<Settlement>;
  readonly myVehicles: ReadonlyArray<Vehicle>;
  readonly ride: Maybe<Ride>;
  readonly rideReviews: ReadonlyArray<Review>;
  readonly searchRides: Maybe<RideConnection>;
  readonly settlementDetail: Maybe<Settlement>;
  readonly userReviews: ReadonlyArray<Review>;
  /** 가입 전 초대 코드 유효성을 검증합니다. */
  readonly validateInviteCode: InviteCode;
};


export type QueryCalculateFareArgs = {
  input: CalculateFareInput;
};


export type QueryChatRoomsArgs = {
  pagination: InputMaybe<PaginationInput>;
};


export type QueryCompanyEsgReportArgs = {
  period: Scalars['String']['input'];
};


export type QueryCompanyMembersArgs = {
  pagination: InputMaybe<PaginationInput>;
};


export type QueryCompanyUsageStatArgs = {
  period: Scalars['String']['input'];
};


export type QueryMessagesArgs = {
  pagination: InputMaybe<PaginationInput>;
  roomId: Scalars['ID']['input'];
};


export type QueryMyRideRequestsArgs = {
  pagination: InputMaybe<PaginationInput>;
  status: InputMaybe<RequestStatus>;
};


export type QueryMyRidesArgs = {
  pagination: InputMaybe<PaginationInput>;
  status: InputMaybe<RideStatus>;
};


export type QueryMySettlementsArgs = {
  pagination: InputMaybe<PaginationInput>;
};


export type QueryRideArgs = {
  id: Scalars['ID']['input'];
};


export type QueryRideReviewsArgs = {
  rideId: Scalars['ID']['input'];
};


export type QuerySearchRidesArgs = {
  input: SearchRidesInput;
  pagination: InputMaybe<PaginationInput>;
};


export type QuerySettlementDetailArgs = {
  id: Scalars['ID']['input'];
};


export type QueryUserReviewsArgs = {
  pagination: InputMaybe<PaginationInput>;
  userId: Scalars['ID']['input'];
};


export type QueryValidateInviteCodeArgs = {
  code: Scalars['String']['input'];
};

export type RegisterPaymentMethodInput = {
  readonly alias: InputMaybe<Scalars['String']['input']>;
  readonly billingKey: Scalars['String']['input'];
  readonly isDefault: InputMaybe<Scalars['Boolean']['input']>;
  readonly type: PaymentType;
};

export type RegisterVehicleInput = {
  readonly capacity: InputMaybe<Scalars['Int']['input']>;
  readonly color: InputMaybe<Scalars['String']['input']>;
  readonly model: Scalars['String']['input'];
  readonly plate: Scalars['String']['input'];
};

export type RequestRideInput = {
  readonly message: InputMaybe<Scalars['String']['input']>;
  readonly pickup: InputMaybe<LatLngInput>;
  readonly pickupAddr: InputMaybe<Scalars['String']['input']>;
  readonly rideId: Scalars['ID']['input'];
};

/** 카풀 요청 상태 */
export const RequestStatus = {
  Accepted: 'ACCEPTED',
  Cancelled: 'CANCELLED',
  Pending: 'PENDING',
  Rejected: 'REJECTED'
} as const;

export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];
export type Review = {
  readonly __typename?: 'Review';
  readonly comment: Maybe<Scalars['String']['output']>;
  readonly createdAt: Scalars['DateTime']['output'];
  readonly fromUser: User;
  readonly id: Scalars['ID']['output'];
  readonly rating: Scalars['Int']['output'];
  readonly ride: Ride;
  readonly toUser: User;
};

export type Ride = {
  readonly __typename?: 'Ride';
  readonly arrival: LatLng;
  readonly arrivalAddr: Maybe<Scalars['String']['output']>;
  readonly availableSeats: Scalars['Int']['output'];
  readonly companyId: Scalars['ID']['output'];
  readonly createdAt: Scalars['DateTime']['output'];
  readonly departure: LatLng;
  readonly departureAddr: Maybe<Scalars['String']['output']>;
  readonly departureTime: Scalars['DateTime']['output'];
  readonly driver: User;
  readonly fare: Maybe<Scalars['Int']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly preferences: Maybe<Scalars['JSON']['output']>;
  readonly requests: ReadonlyArray<RideRequest>;
  readonly status: RideStatus;
  readonly updatedAt: Scalars['DateTime']['output'];
};

export type RideConnection = {
  readonly __typename?: 'RideConnection';
  readonly nodes: ReadonlyArray<Ride>;
  readonly pageInfo: PageInfo;
  readonly totalCount: Scalars['Int']['output'];
};

export type RideRequest = {
  readonly __typename?: 'RideRequest';
  readonly createdAt: Scalars['DateTime']['output'];
  readonly id: Scalars['ID']['output'];
  readonly message: Maybe<Scalars['String']['output']>;
  readonly passenger: User;
  readonly pickup: Maybe<LatLng>;
  readonly pickupAddr: Maybe<Scalars['String']['output']>;
  readonly ride: Ride;
  readonly status: RequestStatus;
  readonly updatedAt: Scalars['DateTime']['output'];
};

/** 카풀 상태 */
export const RideStatus = {
  Cancelled: 'CANCELLED',
  Completed: 'COMPLETED',
  InProgress: 'IN_PROGRESS',
  Matched: 'MATCHED',
  Open: 'OPEN'
} as const;

export type RideStatus = typeof RideStatus[keyof typeof RideStatus];
/** 사용자 역할 */
export const Role = {
  Admin: 'ADMIN',
  Both: 'BOTH',
  Driver: 'DRIVER',
  Passenger: 'PASSENGER'
} as const;

export type Role = typeof Role[keyof typeof Role];
export type SearchRidesInput = {
  readonly arrival: LatLngInput;
  readonly departure: LatLngInput;
  readonly departureTime: Scalars['DateTime']['input'];
  readonly passengers: InputMaybe<Scalars['Int']['input']>;
  readonly radiusKm: InputMaybe<Scalars['Float']['input']>;
};

export type Settlement = {
  readonly __typename?: 'Settlement';
  readonly amount: Scalars['Int']['output'];
  readonly companyFee: Scalars['Int']['output'];
  readonly createdAt: Scalars['DateTime']['output'];
  readonly driverAmount: Scalars['Int']['output'];
  readonly dueDate: Maybe<Scalars['DateTime']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly paidAt: Maybe<Scalars['DateTime']['output']>;
  readonly passenger: User;
  readonly passengerFee: Scalars['Int']['output'];
  readonly platformFee: Scalars['Int']['output'];
  readonly ride: Ride;
  readonly status: SettlementStatus;
};

/** 정산 상태 */
export const SettlementStatus = {
  Cancelled: 'CANCELLED',
  Failed: 'FAILED',
  Paid: 'PAID',
  Pending: 'PENDING'
} as const;

export type SettlementStatus = typeof SettlementStatus[keyof typeof SettlementStatus];
export type UpdateProfileInput = {
  readonly employeeId: InputMaybe<Scalars['String']['input']>;
  readonly imageUrl: InputMaybe<Scalars['String']['input']>;
  readonly name: InputMaybe<Scalars['String']['input']>;
  readonly phone: InputMaybe<Scalars['String']['input']>;
  readonly role: InputMaybe<Role>;
};

export type UpdateVehicleInput = {
  readonly capacity: InputMaybe<Scalars['Int']['input']>;
  readonly color: InputMaybe<Scalars['String']['input']>;
  readonly model: InputMaybe<Scalars['String']['input']>;
  readonly plate: InputMaybe<Scalars['String']['input']>;
};

export type UsageStat = {
  readonly __typename?: 'UsageStat';
  readonly activeUsers: Scalars['Int']['output'];
  readonly period: Scalars['String']['output'];
  readonly totalDistanceKm: Scalars['Float']['output'];
  readonly totalRides: Scalars['Int']['output'];
  readonly totalUsers: Scalars['Int']['output'];
};

/** 사용자 */
export type User = {
  readonly __typename?: 'User';
  readonly company: Maybe<Company>;
  readonly companyId: Scalars['ID']['output'];
  readonly createdAt: Scalars['DateTime']['output'];
  readonly email: Scalars['String']['output'];
  readonly employeeId: Maybe<Scalars['String']['output']>;
  readonly id: Scalars['ID']['output'];
  readonly imageUrl: Maybe<Scalars['String']['output']>;
  readonly name: Scalars['String']['output'];
  readonly phone: Maybe<Scalars['String']['output']>;
  readonly provider: Maybe<Scalars['String']['output']>;
  readonly providerId: Maybe<Scalars['String']['output']>;
  readonly rating: Scalars['Float']['output'];
  readonly rideCount: Scalars['Int']['output'];
  readonly role: Role;
  readonly updatedAt: Scalars['DateTime']['output'];
  readonly vehicles: ReadonlyArray<Vehicle>;
};

/** 차량 */
export type Vehicle = {
  readonly __typename?: 'Vehicle';
  readonly capacity: Scalars['Int']['output'];
  readonly color: Maybe<Scalars['String']['output']>;
  readonly createdAt: Scalars['DateTime']['output'];
  readonly id: Scalars['ID']['output'];
  readonly model: Scalars['String']['output'];
  readonly plate: Scalars['String']['output'];
  readonly userId: Scalars['ID']['output'];
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
  AuthPayload: ResolverTypeWrapper<AuthPayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  CalculateFareInput: CalculateFareInput;
  ChatRoom: ResolverTypeWrapper<ChatRoom>;
  Company: ResolverTypeWrapper<Company>;
  CompanyPlan: CompanyPlan;
  CreateReviewInput: CreateReviewInput;
  CreateRideInput: CreateRideInput;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  DependencyHealth: ResolverTypeWrapper<DependencyHealth>;
  EsgReport: ResolverTypeWrapper<EsgReport>;
  FareCalculation: ResolverTypeWrapper<FareCalculation>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GenerateInviteCodeInput: GenerateInviteCodeInput;
  Health: ResolverTypeWrapper<Health>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  InviteCode: ResolverTypeWrapper<InviteCode>;
  InviteCodeConnection: ResolverTypeWrapper<InviteCodeConnection>;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  JoinWithInviteCodeInput: JoinWithInviteCodeInput;
  LatLng: ResolverTypeWrapper<LatLng>;
  LatLngInput: LatLngInput;
  LoginInput: LoginInput;
  MemberConnection: ResolverTypeWrapper<MemberConnection>;
  Message: ResolverTypeWrapper<Message>;
  MessageConnection: ResolverTypeWrapper<MessageConnection>;
  MessageType: MessageType;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  PageInfo: ResolverTypeWrapper<PageInfo>;
  PaginationInput: PaginationInput;
  PaymentMethod: ResolverTypeWrapper<PaymentMethod>;
  PaymentType: PaymentType;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  RegisterPaymentMethodInput: RegisterPaymentMethodInput;
  RegisterVehicleInput: RegisterVehicleInput;
  RequestRideInput: RequestRideInput;
  RequestStatus: RequestStatus;
  Review: ResolverTypeWrapper<Review>;
  Ride: ResolverTypeWrapper<Ride>;
  RideConnection: ResolverTypeWrapper<RideConnection>;
  RideRequest: ResolverTypeWrapper<RideRequest>;
  RideStatus: RideStatus;
  Role: Role;
  SearchRidesInput: SearchRidesInput;
  Settlement: ResolverTypeWrapper<Settlement>;
  SettlementStatus: SettlementStatus;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  UpdateProfileInput: UpdateProfileInput;
  UpdateVehicleInput: UpdateVehicleInput;
  UsageStat: ResolverTypeWrapper<UsageStat>;
  User: ResolverTypeWrapper<User>;
  Vehicle: ResolverTypeWrapper<Vehicle>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AuthPayload: AuthPayload;
  Boolean: Scalars['Boolean']['output'];
  CalculateFareInput: CalculateFareInput;
  ChatRoom: ChatRoom;
  Company: Company;
  CreateReviewInput: CreateReviewInput;
  CreateRideInput: CreateRideInput;
  DateTime: Scalars['DateTime']['output'];
  DependencyHealth: DependencyHealth;
  EsgReport: EsgReport;
  FareCalculation: FareCalculation;
  Float: Scalars['Float']['output'];
  GenerateInviteCodeInput: GenerateInviteCodeInput;
  Health: Health;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  InviteCode: InviteCode;
  InviteCodeConnection: InviteCodeConnection;
  JSON: Scalars['JSON']['output'];
  JoinWithInviteCodeInput: JoinWithInviteCodeInput;
  LatLng: LatLng;
  LatLngInput: LatLngInput;
  LoginInput: LoginInput;
  MemberConnection: MemberConnection;
  Message: Message;
  MessageConnection: MessageConnection;
  Mutation: Record<PropertyKey, never>;
  PageInfo: PageInfo;
  PaginationInput: PaginationInput;
  PaymentMethod: PaymentMethod;
  Query: Record<PropertyKey, never>;
  RegisterPaymentMethodInput: RegisterPaymentMethodInput;
  RegisterVehicleInput: RegisterVehicleInput;
  RequestRideInput: RequestRideInput;
  Review: Review;
  Ride: Ride;
  RideConnection: RideConnection;
  RideRequest: RideRequest;
  SearchRidesInput: SearchRidesInput;
  Settlement: Settlement;
  String: Scalars['String']['output'];
  UpdateProfileInput: UpdateProfileInput;
  UpdateVehicleInput: UpdateVehicleInput;
  UsageStat: UsageStat;
  User: User;
  Vehicle: Vehicle;
};

export type AdminOnlyDirectiveArgs = { };

export type AdminOnlyDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = AdminOnlyDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AuthDirectiveArgs = { };

export type AuthDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = AuthDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type CompanyScopeDirectiveArgs = { };

export type CompanyScopeDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = CompanyScopeDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AuthPayloadResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = {
  accessToken: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  refreshToken: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  user: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type ChatRoomResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['ChatRoom'] = ResolversParentTypes['ChatRoom']> = {
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lastMessage: Resolver<Maybe<ResolversTypes['Message']>, ParentType, ContextType>;
  ride: Resolver<ResolversTypes['Ride'], ParentType, ContextType>;
  unreadCount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
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

export type DependencyHealthResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['DependencyHealth'] = ResolversParentTypes['DependencyHealth']> = {
  latencyMs: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  message: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type EsgReportResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['EsgReport'] = ResolversParentTypes['EsgReport']> = {
  co2SavedKg: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  participantCount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  period: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalDistanceKm: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalRides: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type FareCalculationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['FareCalculation'] = ResolversParentTypes['FareCalculation']> = {
  baseFare: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  companySubsidy: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  distanceKm: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  driverAmount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  passengerAmount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  platformFee: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type HealthResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Health'] = ResolversParentTypes['Health']> = {
  database: Resolver<ResolversTypes['DependencyHealth'], ParentType, ContextType>;
  redis: Resolver<ResolversTypes['DependencyHealth'], ParentType, ContextType>;
  service: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  status: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timestamp: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  uptimeSec: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type InviteCodeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InviteCode'] = ResolversParentTypes['InviteCode']> = {
  code: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  company: Resolver<ResolversTypes['Company'], ParentType, ContextType>;
  companyId: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  createdBy: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  currentUses: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  expiresAt: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isActive: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  maxUses: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type InviteCodeConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['InviteCodeConnection'] = ResolversParentTypes['InviteCodeConnection']> = {
  nodes: Resolver<ReadonlyArray<ResolversTypes['InviteCode']>, ParentType, ContextType>;
  pageInfo: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type LatLngResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['LatLng'] = ResolversParentTypes['LatLng']> = {
  lat: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  lng: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
};

export type MemberConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MemberConnection'] = ResolversParentTypes['MemberConnection']> = {
  nodes: Resolver<ReadonlyArray<ResolversTypes['User']>, ParentType, ContextType>;
  pageInfo: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type MessageResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Message'] = ResolversParentTypes['Message']> = {
  content: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  roomId: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  sender: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  type: Resolver<ResolversTypes['MessageType'], ParentType, ContextType>;
};

export type MessageConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['MessageConnection'] = ResolversParentTypes['MessageConnection']> = {
  nodes: Resolver<ReadonlyArray<ResolversTypes['Message']>, ParentType, ContextType>;
  pageInfo: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  acceptRideRequest: Resolver<Maybe<ResolversTypes['RideRequest']>, ParentType, ContextType, RequireFields<MutationAcceptRideRequestArgs, 'id'>>;
  cancelRide: Resolver<Maybe<ResolversTypes['Ride']>, ParentType, ContextType, RequireFields<MutationCancelRideArgs, 'id'>>;
  cancelRideRequest: Resolver<Maybe<ResolversTypes['RideRequest']>, ParentType, ContextType, RequireFields<MutationCancelRideRequestArgs, 'id'>>;
  createReview: Resolver<Maybe<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<MutationCreateReviewArgs, 'input'>>;
  createRide: Resolver<Maybe<ResolversTypes['Ride']>, ParentType, ContextType, RequireFields<MutationCreateRideArgs, 'input'>>;
  deactivateInviteCode: Resolver<ResolversTypes['InviteCode'], ParentType, ContextType, RequireFields<MutationDeactivateInviteCodeArgs, 'id'>>;
  deletePaymentMethod: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeletePaymentMethodArgs, 'id'>>;
  deleteVehicle: Resolver<Maybe<ResolversTypes['Boolean']>, ParentType, ContextType, RequireFields<MutationDeleteVehicleArgs, 'id'>>;
  generateInviteCode: Resolver<ResolversTypes['InviteCode'], ParentType, ContextType, RequireFields<MutationGenerateInviteCodeArgs, 'input'>>;
  joinWithInviteCode: Resolver<Maybe<ResolversTypes['AuthPayload']>, ParentType, ContextType, RequireFields<MutationJoinWithInviteCodeArgs, 'input'>>;
  login: Resolver<Maybe<ResolversTypes['AuthPayload']>, ParentType, ContextType, RequireFields<MutationLoginArgs, 'input'>>;
  paySettlement: Resolver<Maybe<ResolversTypes['Settlement']>, ParentType, ContextType, RequireFields<MutationPaySettlementArgs, 'idempotencyKey' | 'settlementId'>>;
  refreshToken: Resolver<Maybe<ResolversTypes['AuthPayload']>, ParentType, ContextType, RequireFields<MutationRefreshTokenArgs, 'token'>>;
  registerPaymentMethod: Resolver<Maybe<ResolversTypes['PaymentMethod']>, ParentType, ContextType, RequireFields<MutationRegisterPaymentMethodArgs, 'input'>>;
  registerVehicle: Resolver<Maybe<ResolversTypes['Vehicle']>, ParentType, ContextType, RequireFields<MutationRegisterVehicleArgs, 'input'>>;
  rejectRideRequest: Resolver<Maybe<ResolversTypes['RideRequest']>, ParentType, ContextType, RequireFields<MutationRejectRideRequestArgs, 'id'>>;
  requestRide: Resolver<Maybe<ResolversTypes['RideRequest']>, ParentType, ContextType, RequireFields<MutationRequestRideArgs, 'input'>>;
  updateProfile: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType, RequireFields<MutationUpdateProfileArgs, 'input'>>;
  updateRide: Resolver<Maybe<ResolversTypes['Ride']>, ParentType, ContextType, RequireFields<MutationUpdateRideArgs, 'id' | 'input'>>;
  updateVehicle: Resolver<Maybe<ResolversTypes['Vehicle']>, ParentType, ContextType, RequireFields<MutationUpdateVehicleArgs, 'id' | 'input'>>;
};

export type PageInfoResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PageInfo'] = ResolversParentTypes['PageInfo']> = {
  endCursor: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  hasNextPage: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
};

export type PaymentMethodResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['PaymentMethod'] = ResolversParentTypes['PaymentMethod']> = {
  alias: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  isDefault: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  type: Resolver<ResolversTypes['PaymentType'], ParentType, ContextType>;
};

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  calculateFare: Resolver<Maybe<ResolversTypes['FareCalculation']>, ParentType, ContextType, RequireFields<QueryCalculateFareArgs, 'input'>>;
  chatRooms: Resolver<ReadonlyArray<ResolversTypes['ChatRoom']>, ParentType, ContextType, QueryChatRoomsArgs>;
  companyEsgReport: Resolver<Maybe<ResolversTypes['EsgReport']>, ParentType, ContextType, RequireFields<QueryCompanyEsgReportArgs, 'period'>>;
  companyMembers: Resolver<Maybe<ResolversTypes['MemberConnection']>, ParentType, ContextType, QueryCompanyMembersArgs>;
  companyUsageStat: Resolver<Maybe<ResolversTypes['UsageStat']>, ParentType, ContextType, RequireFields<QueryCompanyUsageStatArgs, 'period'>>;
  health: Resolver<ResolversTypes['Health'], ParentType, ContextType>;
  inviteCodes: Resolver<ReadonlyArray<ResolversTypes['InviteCode']>, ParentType, ContextType>;
  me: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  messages: Resolver<Maybe<ResolversTypes['MessageConnection']>, ParentType, ContextType, RequireFields<QueryMessagesArgs, 'roomId'>>;
  myCompany: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  myPaymentMethods: Resolver<ReadonlyArray<ResolversTypes['PaymentMethod']>, ParentType, ContextType>;
  myRideRequests: Resolver<ReadonlyArray<ResolversTypes['RideRequest']>, ParentType, ContextType, QueryMyRideRequestsArgs>;
  myRides: Resolver<Maybe<ResolversTypes['RideConnection']>, ParentType, ContextType, QueryMyRidesArgs>;
  mySettlements: Resolver<ReadonlyArray<ResolversTypes['Settlement']>, ParentType, ContextType, QueryMySettlementsArgs>;
  myVehicles: Resolver<ReadonlyArray<ResolversTypes['Vehicle']>, ParentType, ContextType>;
  ride: Resolver<Maybe<ResolversTypes['Ride']>, ParentType, ContextType, RequireFields<QueryRideArgs, 'id'>>;
  rideReviews: Resolver<ReadonlyArray<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<QueryRideReviewsArgs, 'rideId'>>;
  searchRides: Resolver<Maybe<ResolversTypes['RideConnection']>, ParentType, ContextType, RequireFields<QuerySearchRidesArgs, 'input'>>;
  settlementDetail: Resolver<Maybe<ResolversTypes['Settlement']>, ParentType, ContextType, RequireFields<QuerySettlementDetailArgs, 'id'>>;
  userReviews: Resolver<ReadonlyArray<ResolversTypes['Review']>, ParentType, ContextType, RequireFields<QueryUserReviewsArgs, 'userId'>>;
  validateInviteCode: Resolver<ResolversTypes['InviteCode'], ParentType, ContextType, RequireFields<QueryValidateInviteCodeArgs, 'code'>>;
};

export type ReviewResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Review'] = ResolversParentTypes['Review']> = {
  comment: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fromUser: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  rating: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ride: Resolver<ResolversTypes['Ride'], ParentType, ContextType>;
  toUser: Resolver<ResolversTypes['User'], ParentType, ContextType>;
};

export type RideResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Ride'] = ResolversParentTypes['Ride']> = {
  arrival: Resolver<ResolversTypes['LatLng'], ParentType, ContextType>;
  arrivalAddr: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  availableSeats: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  companyId: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  departure: Resolver<ResolversTypes['LatLng'], ParentType, ContextType>;
  departureAddr: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  departureTime: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  driver: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  fare: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  preferences: Resolver<Maybe<ResolversTypes['JSON']>, ParentType, ContextType>;
  requests: Resolver<ReadonlyArray<ResolversTypes['RideRequest']>, ParentType, ContextType>;
  status: Resolver<ResolversTypes['RideStatus'], ParentType, ContextType>;
  updatedAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type RideConnectionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RideConnection'] = ResolversParentTypes['RideConnection']> = {
  nodes: Resolver<ReadonlyArray<ResolversTypes['Ride']>, ParentType, ContextType>;
  pageInfo: Resolver<ResolversTypes['PageInfo'], ParentType, ContextType>;
  totalCount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type RideRequestResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['RideRequest'] = ResolversParentTypes['RideRequest']> = {
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  message: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  passenger: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  pickup: Resolver<Maybe<ResolversTypes['LatLng']>, ParentType, ContextType>;
  pickupAddr: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  ride: Resolver<ResolversTypes['Ride'], ParentType, ContextType>;
  status: Resolver<ResolversTypes['RequestStatus'], ParentType, ContextType>;
  updatedAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
};

export type SettlementResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Settlement'] = ResolversParentTypes['Settlement']> = {
  amount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  companyFee: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  driverAmount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  dueDate: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  paidAt: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  passenger: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  passengerFee: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  platformFee: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  ride: Resolver<ResolversTypes['Ride'], ParentType, ContextType>;
  status: Resolver<ResolversTypes['SettlementStatus'], ParentType, ContextType>;
};

export type UsageStatResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['UsageStat'] = ResolversParentTypes['UsageStat']> = {
  activeUsers: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  period: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  totalDistanceKm: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  totalRides: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  totalUsers: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  company: Resolver<Maybe<ResolversTypes['Company']>, ParentType, ContextType>;
  companyId: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  email: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  employeeId: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  imageUrl: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  name: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  phone: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  provider: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  providerId: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  rating: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  rideCount: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  role: Resolver<ResolversTypes['Role'], ParentType, ContextType>;
  updatedAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  vehicles: Resolver<ReadonlyArray<ResolversTypes['Vehicle']>, ParentType, ContextType>;
};

export type VehicleResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Vehicle'] = ResolversParentTypes['Vehicle']> = {
  capacity: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  color: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  createdAt: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  id: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  model: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  plate: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  userId: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
};

export type Resolvers<ContextType = GraphQLContext> = {
  AuthPayload: AuthPayloadResolvers<ContextType>;
  ChatRoom: ChatRoomResolvers<ContextType>;
  Company: CompanyResolvers<ContextType>;
  DateTime: GraphQLScalarType;
  DependencyHealth: DependencyHealthResolvers<ContextType>;
  EsgReport: EsgReportResolvers<ContextType>;
  FareCalculation: FareCalculationResolvers<ContextType>;
  Health: HealthResolvers<ContextType>;
  InviteCode: InviteCodeResolvers<ContextType>;
  InviteCodeConnection: InviteCodeConnectionResolvers<ContextType>;
  JSON: GraphQLScalarType;
  LatLng: LatLngResolvers<ContextType>;
  MemberConnection: MemberConnectionResolvers<ContextType>;
  Message: MessageResolvers<ContextType>;
  MessageConnection: MessageConnectionResolvers<ContextType>;
  Mutation: MutationResolvers<ContextType>;
  PageInfo: PageInfoResolvers<ContextType>;
  PaymentMethod: PaymentMethodResolvers<ContextType>;
  Query: QueryResolvers<ContextType>;
  Review: ReviewResolvers<ContextType>;
  Ride: RideResolvers<ContextType>;
  RideConnection: RideConnectionResolvers<ContextType>;
  RideRequest: RideRequestResolvers<ContextType>;
  Settlement: SettlementResolvers<ContextType>;
  UsageStat: UsageStatResolvers<ContextType>;
  User: UserResolvers<ContextType>;
  Vehicle: VehicleResolvers<ContextType>;
};

export type DirectiveResolvers<ContextType = GraphQLContext> = {
  adminOnly: AdminOnlyDirectiveResolver<any, any, ContextType>;
  auth: AuthDirectiveResolver<any, any, ContextType>;
  companyScope: CompanyScopeDirectiveResolver<any, any, ContextType>;
};
