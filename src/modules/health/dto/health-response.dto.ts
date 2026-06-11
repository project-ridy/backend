import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType('Health')
export class HealthResponseDto {
  @Field(() => String)
  status!: 'ok';

  @Field(() => String)
  service!: 'ridy-backend';
}
