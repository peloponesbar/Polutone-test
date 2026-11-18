// Load .env, then point integration tests at the separate test database,
// so tests never touch local development data.
import 'dotenv/config'

if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST
} else {
  throw new Error('DATABASE_URL_TEST is not set (see .env.example): integration tests need their own database')
}
