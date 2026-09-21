import pino from 'pino'

const logger = pino(
  process.env.NODE_ENV !== 'production'
    ? { transport: { target: 'pino-pretty', options: { colorize: true, singleLine: true } } }
    : {}
)

export default logger
