export async function authenticate(request, reply) {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({ success: false, message: 'Unauthorized. Please login.' });
  }
}

export function requireRole(...roles) {
  return async function (request, reply) {
    try {
      await request.jwtVerify();
      if (!roles.includes(request.user.role)) {
        return reply.code(403).send({ success: false, message: 'Forbidden. Insufficient permissions.' });
      }
    } catch (err) {
      reply.code(401).send({ success: false, message: 'Unauthorized.' });
    }
  };
}
