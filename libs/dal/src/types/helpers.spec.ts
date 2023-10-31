import { Types } from 'mongoose';
import { ObjectIdKey, TransformValues, ChangePropsValueType } from './helpers';

/**
 * ObjectIdKey tests
 */
// Valid Key
export const validObjectIdKey: ObjectIdKey = '_somethingId';

// @ts-expect-error - incorrect format
export const invalidObjectIdKey: ObjectIdKey = 'someId';

/**
 * TransformValues tests
 */
type TestTransformObject = {
  foo: string;
  bar?: number;
};
type TestTransformedObject = TransformValues<TestTransformObject, 'foo', number>;

// Valid transformed object WITHOUT undefined keys
export const validTransformedObject: TestTransformedObject = {
  foo: 123,
};

// Valid changed object WITH undefined keys
export const validTransformedUndefinedKeysObject: TestTransformedObject = {
  foo: 123,
  bar: undefined,
};

// Valid changed object with union type
export const validTransformedUnionKeysObject: TransformValues<TestTransformObject, 'foo', number | boolean> = {
  foo: false,
};

export const invalidTransformedDefinedKeysObject: TestTransformedObject = {
  // @ts-expect-error - foo should be of type `number`
  foo: '12345',
};

// @ts-expect-error - `foo` is not defined
export const missingDefinedKeysObject: TestTransformedObject = {};

/**
 * ChangePropsValueType tests
 */
type TestChangeObject = {
  _fooId: string;
  _barId?: string;
  baz: string;
  qux?: number;
};
type TestChangedObject = ChangePropsValueType<TestChangeObject>;

// Valid changed object WITHOUT undefined keys and non transformed key
export const validKeysObject: TestChangedObject = {
  _fooId: new Types.ObjectId('12345'),
  baz: 'something',
};

// Valid changed object WITH undefined keys and non transformed undefined key
export const validUndefinedKeysObject: TestChangedObject = {
  _fooId: new Types.ObjectId('12345'),
  _barId: undefined,
  baz: 'something',
  qux: undefined,
};

export const invalidDefinedKeysObject: TestChangedObject = {
  // @ts-expect-error - `foo` is transformed to type 'ObjectId'.
  _fooId: '12345',
  baz: 'something',
};
