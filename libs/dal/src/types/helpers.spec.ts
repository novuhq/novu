import { Types } from 'mongoose';
import { ObjectIdKey, TransformValues, TransformEntityToDbModel, Dot, DeepKeys, ExtractDot } from './helpers';

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

// @ts-expect-error - Type 'string' is not assignable to type 'never'
export const invalidSingleDepthStopTypeKey: DeepKeys<string> = 'invalid';

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
}
type HogeUnion = 'unionOne' | 'unionTwo';
type PiyoFunc = () => void;
type TestDotObj = {
  foo: string;
  fuga: number;
  hodo: boolean;
  thud: ThudEnum;
  hoge: HogeUnion;
  frob: symbol;
  mung: Date;
  piyo: PiyoFunc;
  qux: Qux;
  bar: IBar;
  tutu: {
    titi: string;
  };
  toto: Array<{
    hodo: string;
  }>;
  corge: Array<number>;
  hogera?: string;
  plugh?: {
    xyzzy: string;
  };
  quux?: Array<number>;
  waldo?: Array<{
    baz: boolean;
  }>;
  hede: {
    foo: string;
    fuga: number;
    hodo: boolean;
    thud: ThudEnum;
    hoge: HogeUnion;
    frob: symbol;
    mung: Date;
    piyo: PiyoFunc;
    qux: Qux;
    bar: IBar;
    tutu: {
      titi: string;
    };
    toto: Array<{
      hodo: string;
    }>;
    corge: Array<number>;
    hogera?: string;
    plugh?: {
      xyzzy: string;
    };
    quux?: Array<number>;
    waldo?: Array<{
      baz: boolean;
    }>;
  };
  grault: Array<{
    foo: string;
    fuga: number;
    hodo: boolean;
    thud: ThudEnum;
    hoge: HogeUnion;
    frob: symbol;
    mung: Date;
    piyo: PiyoFunc;
    qux: Qux;
    bar: IBar;
    tutu: {
      titi: string;
    };
    toto: Array<{
      hodo: string;
    }>;
    corge: Array<number>;
    hogera?: string;
    plugh?: {
      xyzzy: string;
    };
    quux?: Array<number>;
    waldo?: Array<{
      baz: boolean;
    }>;
  }>;
};

// GENERIC PARAMETER TESTS
export type ValidConstrainedRootGenericParam = ExtractDot<TestDotObj, 'foo'>;
export type ValidConstrainedNestedGenericParam = ExtractDot<TestDotObj, 'bar.baz'>;
// @ts-expect-error - invalid generic root param
export type InvalidConstrainedRootGenericParam = ExtractDot<TestDotObj, 'invalid'>;
// @ts-expect-error - invalid generic nested param
export type InvalidConstrainedNestedGenericParam = ExtractDot<TestDotObj, 'bar.invalid'>;

// ROOT VALUE TESTS
export const validRootStringValue: ExtractDot<TestDotObj, 'foo'> = 'something';
export const validRootNumberValue: ExtractDot<TestDotObj, 'fuga'> = 123;
export const validRootBooleanValue: ExtractDot<TestDotObj, 'hodo'> = true;
export const validRootEnumValue: ExtractDot<TestDotObj, 'thud'> = ThudEnum.FOO;
export const validRootUnionValue: ExtractDot<TestDotObj, 'hoge'> = 'unionOne';
export const validRootSymbolValue: ExtractDot<TestDotObj, 'frob'> = Symbol('something');
export const validRootDateValue: ExtractDot<TestDotObj, 'mung'> = new Date();
export const validRootFunctionValue: ExtractDot<TestDotObj, 'piyo'> = () => {};
export const validRootInterfaceValue: ExtractDot<TestDotObj, 'bar'> = { baz: true };
export const validRootClassValue: ExtractDot<TestDotObj, 'qux'> = { quux: 'something' };
export const validRootSimpleObjectValue: ExtractDot<TestDotObj, 'tutu'> = { titi: 'something' };
export const validRootArraySimpleObjectValue: ExtractDot<TestDotObj, 'toto'> = [{ hodo: 'something' }];
export const validRootSimpleArrayValue: ExtractDot<TestDotObj, 'corge'> = [1, 2, 3];
export const validRootOptionalValue: ExtractDot<TestDotObj, 'hogera'> = 'something';
export const validRootOptionalObjectValue: ExtractDot<TestDotObj, 'plugh'> = { xyzzy: 'something' };
export const validRootComplexObjectValue: ExtractDot<TestDotObj, 'hede'> = {
  foo: 'something',
  fuga: 123,
  hodo: true,
  thud: ThudEnum.FOO,
  hoge: 'unionOne',
  frob: Symbol('something'),
  mung: new Date(),
  piyo: () => {},
  bar: { baz: true },
  qux: { quux: 'something' },
  tutu: { titi: 'something' },
  toto: [{ hodo: 'something' }],
  corge: [1, 2, 3],
  hogera: 'something',
  plugh: { xyzzy: 'something' },
};
export const validRootComplexArrayValue: ExtractDot<TestDotObj, 'grault'> = [
  {
    foo: 'something',
    fuga: 123,
    hodo: true,
    thud: ThudEnum.FOO,
    hoge: 'unionOne',
    frob: Symbol('something'),
    mung: new Date(),
    piyo: () => {},
    bar: { baz: true },
    qux: { quux: 'something' },
    tutu: { titi: 'something' },
    toto: [{ hodo: 'something' }],
    corge: [1, 2, 3],
    hogera: 'something',
    plugh: { xyzzy: 'something' },
  },
];

// @ts-expect-error - invalid string value
export const invalidRootStringValue: ExtractDot<TestDotObj, 'foo'> = 123;
// @ts-expect-error - invalid number value
export const invalidRootNumberValue: ExtractDot<TestDotObj, 'fuga'> = 'invalidNumber';
// @ts-expect-error - invalid boolean value
export const invalidRootBooleanValue: ExtractDot<TestDotObj, 'hodo'> = 'invalidBoolean';
// @ts-expect-error - invalid enum value
export const invalidRootEnumValue: ExtractDot<TestDotObj, 'thud'> = 'invalidEnum';
// @ts-expect-error - invalid union value
export const invalidRootUnionValue: ExtractDot<TestDotObj, 'hoge'> = 'invalidUnion';
// @ts-expect-error - invalid symbol value
export const invalidRootSymbolValue: ExtractDot<TestDotObj, 'frob'> = 'invalidSymbol';
// @ts-expect-error - invalid date value
export const invalidRootDateValue: ExtractDot<TestDotObj, 'mung'> = 'invalidDate';
// @ts-expect-error - invalid function value
export const invalidRootFunctionValue: ExtractDot<TestDotObj, 'piyo'> = 'invalidFunction';
// @ts-expect-error - invalid interface value
export const invalidRootInterfaceValue: ExtractDot<TestDotObj, 'bar'> = 'invalidInterface';
// @ts-expect-error - invalid class value
export const invalidRootClassValue: ExtractDot<TestDotObj, 'qux'> = 'invalidClass';
// @ts-expect-error - invalid simple object value
export const invalidRootSimpleObjectValue: ExtractDot<TestDotObj, 'tutu'> = 'invalidSimpleObject';
// @ts-expect-error - invalid simple array value
export const invalidRootSimpleArrayValue: ExtractDot<TestDotObj, 'corge'> = 'invalidSimpleArray';
// @ts-expect-error - invalid optional value
export const invalidRootOptionalValue: ExtractDot<TestDotObj, 'hogera'> = undefined;
// @ts-expect-error - invalid optional object value
export const invalidRootOptionalObjectValue: ExtractDot<TestDotObj, 'plugh'> = 'invalidOptionalObject';
// @ts-expect-error - invalid complex object value
export const invalidRootComplexObjectValue: ExtractDot<TestDotObj, 'hede'> = 'invalidComplexObject';
// @ts-expect-error - invalid complex array value
export const invalidRootComplexArrayValue: ExtractDot<TestDotObj, 'grault'> = 'invalidComplexArray';
// @ts-expect-error - missing 'titi' property
export const invalidRootObjectValue: ExtractDot<TestDotObj, 'tutu'> = {};
// @ts-expect-error - missing 'hodo' property
export const invalidRootArrayObjectValue: ExtractDot<TestDotObj, 'toto'> = [{}];
export const invalidRootObjectPropertyValue: ExtractDot<TestDotObj, 'tutu'> = {
  // @ts-expect-error - 'invalid' does not exist in object
  invalid: true,
  titi: 'something',
};
export const invalidRootArrayObjectPropertyValue: ExtractDot<TestDotObj, 'toto'> = [
  {
    // @ts-expect-error - 'invalid' does not exist in object
    invalid: true,
    hodo: 'something',
  },
];

// ROOT OBJECT VALUE TESTS
export const validNestedObjectStringValue: ExtractDot<TestDotObj, 'hede.foo'> = 'something';
export const validNestedObjectNumberValue: ExtractDot<TestDotObj, 'hede.fuga'> = 123;
export const validNestedObjectBooleanValue: ExtractDot<TestDotObj, 'hede.hodo'> = true;
export const validNestedObjectEnumValue: ExtractDot<TestDotObj, 'hede.thud'> = ThudEnum.FOO;
export const validNestedObjectUnionValue: ExtractDot<TestDotObj, 'hede.hoge'> = 'unionOne';
export const validNestedObjectSymbolValue: ExtractDot<TestDotObj, 'hede.frob'> = Symbol('something');
export const validNestedObjectDateValue: ExtractDot<TestDotObj, 'hede.mung'> = new Date();
export const validNestedObjectFunctionValue: ExtractDot<TestDotObj, 'hede.piyo'> = () => {};
export const validNestedObjectInterfaceValue: ExtractDot<TestDotObj, 'hede.bar'> = { baz: true };
export const validNestedObjectClassValue: ExtractDot<TestDotObj, 'hede.qux'> = { quux: 'something' };
export const validNestedObjectSimpleObjectValue: ExtractDot<TestDotObj, 'hede.tutu'> = { titi: 'something' };
export const validNestedObjectSimpleArrayValue: ExtractDot<TestDotObj, 'hede.corge'> = [1, 2, 3];
export const validNestedObjectOptionalValue: ExtractDot<TestDotObj, 'hede.hogera'> = 'something';
export const validNestedObjectNestedObjectValue: ExtractDot<TestDotObj, 'hede.plugh'> = { xyzzy: 'something' };

// @ts-expect-error - invalid string value
export const invalidNestedObjectStringValue: ExtractDot<TestDotObj, 'foo'> = 123;
// @ts-expect-error - invalid number value
export const invalidNestedObjectNumberValue: ExtractDot<TestDotObj, 'fuga'> = 'invalidNumber';
// @ts-expect-error - invalid boolean value
export const invalidNestedObjectBooleanValue: ExtractDot<TestDotObj, 'hodo'> = 'invalidBoolean';
// @ts-expect-error - invalid enum value
export const invalidNestedObjectEnumValue: ExtractDot<TestDotObj, 'hede.thud'> = 'invalidEnum';
// @ts-expect-error - invalid union value
export const invalidNestedObjectUnionValue: ExtractDot<TestDotObj, 'hede.hoge'> = 'invalidUnion';
// @ts-expect-error - invalid symbol value
export const invalidNestedObjectSymbolValue: ExtractDot<TestDotObj, 'hede.frob'> = 'invalidSymbol';
// @ts-expect-error - invalid date value
export const invalidNestedObjectDateValue: ExtractDot<TestDotObj, 'hede.mung'> = 'invalidDate';
// @ts-expect-error - invalid function value
export const invalidNestedObjectFunctionValue: ExtractDot<TestDotObj, 'hede.piyo'> = 'invalidFunction';
// @ts-expect-error - invalid interface value
export const invalidNestedObjectInterfaceValue: ExtractDot<TestDotObj, 'hede.bar'> = 'invalidInterface';
// @ts-expect-error - invalid class value
export const invalidNestedObjectClassValue: ExtractDot<TestDotObj, 'hede.qux'> = 'invalidClass';
// @ts-expect-error - invalid simple object value
export const invalidNestedObjectSimpleObjectValue: ExtractDot<TestDotObj, 'hede.tutu'> = 'invalidSimpleObject';
// @ts-expect-error - invalid simple array value
export const invalidNestedObjectSimpleArrayValue: ExtractDot<TestDotObj, 'hede.corge'> = 'invalidSimpleArray';
// @ts-expect-error - invalid optional value
export const invalidNestedObjectOptionalValue: ExtractDot<TestDotObj, 'hede.hogera'> = undefined;
// @ts-expect-error - invalid nested object value
export const invalidNestedObjectNestedObjectValue: ExtractDot<TestDotObj, 'hede.plugh'> = 'invalidNestedObject';
// @ts-expect-error - invalid nested object value
export const invalidNestedObjectNestedArrayValue: ExtractDot<TestDotObj, 'hede.quux'> = 'invalidNestedArray';
// @ts-expect-error - missing 'titi' property
export const invalidNestedObjectValue: ExtractDot<TestDotObj, 'hede.tutu'> = {};
// @ts-expect-error - missing 'hodo' property
export const invalidNestedObjectArrayValue: ExtractDot<TestDotObj, 'hede.corge'> = [{}];
export const invalidNestedObjectNonExistingPropertyValue: ExtractDot<TestDotObj, 'hede.waldo'> = {
  // @ts-expect-error - 'invalid' does not exist in object
  invalid: true,
  baz: true,
};
export const invalidNestedObjectNonExistingPropertiesValue: ExtractDot<TestDotObj, 'hede'> = {
  garply: 123,
  // @ts-expect-error - 'invalid' does not exist in type 'IBar'
  waldo: { baz: true, invalid: true },
  // @ts-expect-error - 'invalid' does not exist in type 'IBar'
  hogera: [{ baz: true, invalid: true }],
};

// ROOT ARRAY VALUE TESTS
export const validNestedArrayStringValue: ExtractDot<TestDotObj, 'grault.foo'> = 'something';
export const validNestedArrayNumberValue: ExtractDot<TestDotObj, 'grault.fuga'> = 123;
export const validNestedArrayBooleanValue: ExtractDot<TestDotObj, 'grault.hodo'> = true;
export const validNestedArrayEnumValue: ExtractDot<TestDotObj, 'grault.thud'> = ThudEnum.FOO;
export const validNestedArrayUnionValue: ExtractDot<TestDotObj, 'grault.hoge'> = 'unionOne';
export const validNestedArraySymbolValue: ExtractDot<TestDotObj, 'grault.frob'> = Symbol('something');
export const validNestedArrayDateValue: ExtractDot<TestDotObj, 'grault.mung'> = new Date();
export const validNestedArrayFunctionValue: ExtractDot<TestDotObj, 'grault.piyo'> = () => {};
export const validNestedArrayInterfaceValue: ExtractDot<TestDotObj, 'grault.bar'> = { baz: true };
export const validNestedArrayClassValue: ExtractDot<TestDotObj, 'grault.qux'> = { quux: 'something' };
export const validNestedArraySimpleObjectValue: ExtractDot<TestDotObj, 'grault.tutu'> = { titi: 'something' };
export const validNestedArraySimpleArrayValue: ExtractDot<TestDotObj, 'grault.corge'> = [1, 2, 3];
export const validNestedArrayOptionalValue: ExtractDot<TestDotObj, 'grault.hogera'> = 'something';
export const validNestedArrayNestedObjectValue: ExtractDot<TestDotObj, 'grault.plugh'> = { xyzzy: 'something' };

// @ts-expect-error - invalid string value
export const invalidNestedArrayStringValue: ExtractDot<TestDotObj, 'foo'> = 123;
// @ts-expect-error - invalid number value
export const invalidNestedArrayNumberValue: ExtractDot<TestDotObj, 'fuga'> = 'invalidNumber';
// @ts-expect-error - invalid boolean value
export const invalidNestedArrayBooleanValue: ExtractDot<TestDotObj, 'hodo'> = 'invalidBoolean';
// @ts-expect-error - invalid enum value
export const invalidNestedArrayEnumValue: ExtractDot<TestDotObj, 'grault.thud'> = 'invalidEnum';
// @ts-expect-error - invalid union value
export const invalidNestedArrayUnionValue: ExtractDot<TestDotObj, 'grault.hoge'> = 'invalidUnion';
// @ts-expect-error - invalid symbol value
export const invalidNestedArraySymbolValue: ExtractDot<TestDotObj, 'grault.frob'> = 'invalidSymbol';
// @ts-expect-error - invalid date value
export const invalidNestedArrayDateValue: ExtractDot<TestDotObj, 'grault.mung'> = 'invalidDate';
// @ts-expect-error - invalid function value
export const invalidNestedArrayFunctionValue: ExtractDot<TestDotObj, 'grault.piyo'> = 'invalidFunction';
// @ts-expect-error - invalid interface value
export const invalidNestedArrayInterfaceValue: ExtractDot<TestDotObj, 'grault.bar'> = 'invalidInterface';
// @ts-expect-error - invalid class value
export const invalidNestedArrayClassValue: ExtractDot<TestDotObj, 'grault.qux'> = 'invalidClass';
// @ts-expect-error - invalid simple object value
export const invalidNestedArraySimpleObjectValue: ExtractDot<TestDotObj, 'grault.tutu'> = 'invalidSimpleObject';
// @ts-expect-error - invalid simple array value
export const invalidNestedArraySimpleArrayValue: ExtractDot<TestDotObj, 'grault.corge'> = 'invalidSimpleArray';
// @ts-expect-error - invalid optional value
export const invalidNestedArrayOptionalValue: ExtractDot<TestDotObj, 'grault.hogera'> = undefined;
// @ts-expect-error - invalid nested object value
export const invalidNestedArrayNestedObjectValue: ExtractDot<TestDotObj, 'grault.plugh'> = 'invalidNestedArray';
// @ts-expect-error - invalid nested object value
export const invalidNestedArrayNestedArrayValue: ExtractDot<TestDotObj, 'grault.quux'> = 'invalidNestedArray';
// @ts-expect-error - missing 'titi' property
export const invalidNestedArrayValue: ExtractDot<TestDotObj, 'grault.tutu'> = {};
// @ts-expect-error - missing 'hodo' property
export const invalidNestedArrayArrayValue: ExtractDot<TestDotObj, 'grault.corge'> = [{}];
export const invalidNestedArrayNonExistingPropertyValue: ExtractDot<TestDotObj, 'grault.waldo'> = [
  {
    // @ts-expect-error - 'invalid' does not exist in object
    invalid: true,
    baz: true,
  },
];
export const invalidNestedArrayNonExistingPropertiesValue: ExtractDot<TestDotObj, 'grault'> = [
  {
    garply: 123,
    // @ts-expect-error - 'invalid' does not exist in type 'IBar'
    waldo: { baz: true, invalid: true },
    // @ts-expect-error - 'invalid' does not exist in type 'IBar'
    hogera: [{ baz: true, invalid: true }],
  },
];
