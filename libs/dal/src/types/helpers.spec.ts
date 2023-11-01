import { Types } from 'mongoose';
import { ObjectIdKey, TransformValues, TransformEntityToDbModel, Dot, DeepKeys, ExtractDotNotation } from './helpers';

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

// Valid changed object with type union key
export const validTransformedUnionKeysObject: TransformValues<TestTransformObject, 'foo' | 'bar', boolean> = {
  foo: false,
  bar: true,
};

// Valid changed object with type union value
export const validTransformedUnionValuesObject: TransformValues<TestTransformObject, 'foo', number | boolean> = {
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
  _id: string;
  _fooId: string;
  _barId?: string;
  baz: string;
  qux?: number;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string;
};
type TestChangedObject = TransformEntityToDbModel<TestChangeObject>;

// Valid changed object WITHOUT undefined keys and non transformed key
export const validObjectIdKeysObject: TestChangedObject = {
  _id: new Types.ObjectId('12345'),
  _fooId: new Types.ObjectId('12345'),
  baz: 'something',
};

// Valid changed object WITHOUT undefined keys and non transformed key
export const validStringKeysObject: TestChangedObject = {
  _id: 'something',
  _fooId: 'something',
  baz: 'something',
};

// Valid changed object WITH undefined keys and non transformed undefined key
export const validUndefinedKeysObject: TestChangedObject = {
  _id: new Types.ObjectId('12345'),
  _fooId: new Types.ObjectId('12345'),
  _barId: undefined,
  baz: 'something',
  qux: undefined,
};

export const validDateKeysObject: TestChangedObject = {
  _id: new Types.ObjectId('12345'),
  _fooId: new Types.ObjectId('12345'),
  baz: 'something',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: new Date(),
};

export const invalidDefinedKeysObject: TestChangedObject = {
  _id: new Types.ObjectId('12345'),
  // @ts-expect-error - `foo` is transformed to type 'ObjectId'.
  _fooId: 12345,
  baz: 'something',
};

export const invalidDateKeysObject: TestChangedObject = {
  _id: new Types.ObjectId('12345'),
  _fooId: new Types.ObjectId('12345'),
  baz: 'something',
  // @ts-expect-error - `createdAt` is transformed to type 'Date'.
  createdAt: '2023-10-31T00:20:46.082Z',
};

/**
 * DotPrefix tests
 */
// Valid dot join with single union
export const validSingleUnionPrefix: Dot<'foo', 'bar'> = 'foo.bar';

// Valid dot join with double union
export const validDoubleUnionPrefix: Dot<'foo', 'bar' | 'baz'> = 'foo.baz';

// Valid empty first string
export const validEmptyFirstString: Dot<'', 'test'> = '.test';

// Valid empty second string
export const validEmptySecondString: Dot<'for', ''> = 'for';

// Valid empty second string
export const validEmptyDoubleString: Dot<'', ''> = '';

// @ts-expect-error - missing dot join
export const invalidDotPrefix: Dot<'foo', 'bar'> = 'foobar';

/**
 * DeepKeys tests
 */
type TestDeepKeysObject = {
  bird: string;
  dog: {
    owner: {
      name: string;
    };
  };
  cats?: Array<{
    breed: string;
    address: {
      suburb: string;
      lines: {
        lines1: string;
      };
    };
    contact: Array<{
      mobile: number;
    }>;
  }>;
};
type TestDeepKeys = DeepKeys<TestDeepKeysObject>;

export const validRootObjectKey: TestDeepKeys = 'bird';
export const validNestedObjectKey: TestDeepKeys = 'dog.owner';
export const validLeafObjectKey: TestDeepKeys = 'dog.owner.name';
export const validRootArrayKey: TestDeepKeys = 'cats';
export const validArrayLeafObjectKey: TestDeepKeys = 'cats.breed';
export const validArrayNestedObjectKey: TestDeepKeys = 'cats.address';
export const validArrayObjectLeafKey: TestDeepKeys = 'cats.address.suburb';
export const validArrayObjectNestedKey: TestDeepKeys = 'cats.address.lines';
export const validArrayObjectObjectLeafKey: TestDeepKeys = 'cats.address.lines.lines1';
export const validArrayArrayNestedKey: TestDeepKeys = 'cats.contact';
export const validArrayArrayLeafKey: TestDeepKeys = 'cats.contact.mobile';

// @ts-expect-error - invalid root object key
export const invalidRootObjectKey: TestDeepKeys = 'invalid';

// @ts-expect-error - invalid nested object key
export const invalidNestedObjectKey: TestDeepKeys = 'dog.invalid';

// @ts-expect-error - invalid nested key
export const invalidLeafObjectKey: TestDeepKeys = 'dog.owner.invalid';

// @ts-expect-error - invalid array object key
export const invalidArrayLeafObjectKey: TestDeepKeys = 'cats.invalid';

// @ts-expect-error - invalid array object  key
export const invalidArrayObjectLeafKey: TestDeepKeys = 'cats.address.invalid';

// @ts-expect-error - invalid array object leafkey
export const invalidArrayObjectObjectLeafKey: TestDeepKeys = 'cats.address.lines.invalid';

/**
 * ExtractDotNotation tests
 */
interface IBar {
  baz: boolean;
}
class Qux {
  quux: string;
}
enum ThudEnum {
  FOO = 'foo',
  BAR = 'bar',
}
type HogeUnion = 'unionOne' | 'unionTwo';
type TestNestedObject = {
  foo?: string;
  bar?: IBar;
  qux: Qux;
  corge: Array<number>;
  grault: Array<{
    garply: number;
    waldo: IBar;
    fred: Array<Qux>;
  }>;
  plugh?: {
    xyzzy: string;
  };
  thud: ThudEnum;
  hoge: HogeUnion;
  fuga: {
    thud: ThudEnum;
    hoge: HogeUnion;
  };
};
export type ValidConstrainedRootGenericParam = ExtractDotNotation<TestNestedObject, 'foo'>;
export type ValidConstrainedNestedGenericParam = ExtractDotNotation<TestNestedObject, 'bar.baz'>;
// @ts-expect-error - invalid generic param
export type InvalidConstrainedRootGenericParam = ExtractDotNotation<TestNestedObject, 'invalid'>;
// @ts-expect-error - invalid generic param
export type InvalidConstrainedNestedGenericParam = ExtractDotNotation<TestNestedObject, 'bar.invalid'>;

export const validRootValue: ExtractDotNotation<TestNestedObject, 'foo'> = 'something';
export const validRootInterfaceValue: ExtractDotNotation<TestNestedObject, 'bar'> = {
  baz: true,
};
export const validRootClassValue: ExtractDotNotation<TestNestedObject, 'qux'> = {
  quux: 'something',
};
export const validRootSimpleArrayValue: ExtractDotNotation<TestNestedObject, 'corge'> = [1, 2, 3];
export const validRootComplexArrayValue: ExtractDotNotation<TestNestedObject, 'grault'> = [
  {
    garply: 123,
    waldo: {
      baz: true,
    },
    fred: [
      {
        quux: 'something',
      },
    ],
  },
];
export const validRootOptionalObjectValue: ExtractDotNotation<TestNestedObject, 'plugh'> = {
  xyzzy: 'something',
};
export const validRootEnumValue: ExtractDotNotation<TestNestedObject, 'thud'> = ThudEnum.FOO;

export const validNestedInterfaceValue: ExtractDotNotation<TestNestedObject, 'bar.baz'> = true;
export const validNestedClassValue: ExtractDotNotation<TestNestedObject, 'qux.quux'> = 'something';
export const validNestedOptionalObjectValue: ExtractDotNotation<TestNestedObject, 'plugh.xyzzy'> = 'something';

// @ts-expect-error - invalid enum value
export const invalidRootEnumValue: ExtractDotNotation<TestNestedObject, 'thud'> = 'invalidEnum';
