import { maskValue } from './masking';

describe('Object Masking', function () {
  it('mask variable with sensitive name', async function () {
    const email = 'tim.tim@tim.com';

    const ret = maskValue('email', email);

    expect(ret).toEqual('tim****@tim.com');
  });

  it('should mask a object with a key that matches a sensitize field', async function () {
    const obj = { email: 'tim.tim@tim.com' };

    const ret = maskValue('email', obj);

    expect(ret.email).toEqual('tim****@tim.com');
  });

  it('should handle objects with null fields', async function () {
    const obj = { email: 'tim.tim@tim.com', subscriberId: null };

    const ret = maskValue('Class Arg Name', obj);

    expect(ret.email).toEqual('tim****@tim.com');
    expect(ret.subscriberId).toEqual('null');
  });

  it('should mask controller param object', async function () {
    const obj = {
      methodName: 'WidgetsController.getUnseenCount',
      args: [
        {
          SubscriberEntity: {
            _id: '63d1670214d619964964c64e',
            _organizationId: '63d1670114d619964964c5fe',
            organizationName: null,
            _environmentId: '63d1670114d619964964c604',
            subscriberId: '63d166fb14d619964964c5f5',
            deleted: false,
            createdAt: '2023-01-25T17:29:38.539Z',
            updatedAt: '2023-02-04T20:36:36.718Z',
            __v: 0,
            id: '63d1670214d619964964c64e',
          },
        },
        { seen: false },
      ],
    };

    const ret = maskValue('obj.methodName', obj);
    console.log(JSON.stringify(ret));
  });

  it('should mask sensitive fields in a complex object', async function () {
    const object = {
      _id: '63ff6a45c5ddef9df6cec14b',
      firstName: 'Delphia',
      lastName: 'Volkman',
      email: 'delphia_volkman_04550c71-83d2-4471-b8a2-4a9ccb2d24cc@gmail.com',
      profilePicture: 'https://randomuser.me/api/portraits/men/53.jpg',
      organizationId: null,
      organizationName: "Steve's chicken emporium",
      roles: [],
      environmentId: null,
      iat: 1677683269,
      exp: 1680275269,
      iss: 'novu_api',
      id: '63ff6a45c5ddef9df6cec14b',
      username: 'Delphia',
      domain: 'gmail.com',
      creditCard: '5555555555554444',
    };

    const maskedObject = maskValue('object', object);

    expect(maskedObject.firstName).toEqual('*******');
    expect(maskedObject.lastName).toEqual('*******');
  });
});
