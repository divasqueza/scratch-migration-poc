import { Client } from 'pg';
import { MongoClient } from 'mongodb';

const pgClient = new Client({
  host: process.env.DB__ROSTER__HOST,
  user: process.env.DB__ROSTER__USERNAME,
  password: process.env.DB__ROSTER__PASSWORD,
  database: process.env.DB__ROSTER__DATABASE,
});

const mgClient = new MongoClient(process.env.DB__LICENSE__DATABASE);

async function run() {
  await pgClient.connect();
  await mgClient.connect();

  const res = await pgClient.query('SELECT $1::text as message', ['Hello world!']);
  console.log(res.rows[0].message);

  const database = mgClient.db('sample_mflix');
  const movies = database.collection('movies');
  // Query for a movie that has the title 'Back to the Future'
  const query = { title: 'Back to the Future' };
  const movie = await movies.findOne(query);
  console.log(movie);

  await pgClient.end();
  await mgClient.close();
}

run().catch(console.error)