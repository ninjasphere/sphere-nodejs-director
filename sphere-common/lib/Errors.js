var errors = {};

errors.THING_DOES_NOT_EXIST = {
	status: 404,
	message: 'That thing does not exist.'
};

errors.THING_CREATE_DEVICE_EXISTS = {
	status: 409,
	message: 'That device is already bound to another thing.'
};

errors.ROOM_NOT_EXIST = {
	status: 404,
	message: 'That room does not exist.'
};

errors.INVALID_SETLOCATION_PARAMETERS = {
	status: 400,
	message: 'Thing.setLocation requires a thingId and location'
};

module.exports = errors;