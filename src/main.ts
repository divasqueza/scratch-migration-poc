import { Pool, PoolClient } from 'pg';
import { MongoClient } from 'mongodb';
import Cursor from 'pg-cursor';
import { PgCurriculumCourseInterface } from './pg-curriculum-course.interface';
import { MgCurriculumInterface } from './mg-curriculum.interface';

let pgClient: PoolClient;
const pgPool = new Pool({
  host: process.env.DB__ROSTER__HOST,
  user: process.env.DB__ROSTER__USERNAME,
  password: process.env.DB__ROSTER__PASSWORD,
  database: process.env.DB__ROSTER__DATABASE,
});

const mgClient = new MongoClient(process.env.DB__LICENSE__DATABASE);
const coursesByCurriculumQuery = `
  SELECT 
         course.global_id as courseglobalid, 
         course.name as coursename, 
         curriculum.global_id as curriculumglobalid,
         curriculum.name as curriculumname
  FROM curriculum 
  LEFT JOIN course ON curriculum.id = course.curriculum_id
`;

async function run() {
  try {
    await initializeDBs();
    await cleanDB();

    console.log('Migration started!');
    const cursor = await pgClient.query(new Cursor(coursesByCurriculumQuery));
    const curriculumCollection = mgClient
      .db('license')
      .collection<MgCurriculumInterface>('curriculum');

    let curriculum: PgCurriculumCourseInterface;

    while (curriculum = (await cursor.read(1))[0]) {
      const result = await curriculumCollection.findOneAndUpdate(
        {globalID: curriculum.curriculumglobalid},
        {
          $set: {
            globalID: curriculum.curriculumglobalid,
            name: curriculum.curriculumname,
          },
          $push: {
            courses: {
              globalID: curriculum.courseglobalid,
              name: curriculum.coursename,
            }
          }
        },
        { upsert: true }
      );

      if(result.ok) {
        let operation = result.lastErrorObject.upserted ? 'created' : 'updated';
        console.log(`Curriculum ${curriculum.curriculumglobalid} ${operation}!`);
      }
      else {
        console.log(`Unable to update curriculum ${curriculum.curriculumglobalid}`);
      }
    }

  } finally {
    console.log('Migration finished!');
    await finalizeDBs();
  }
}

async function initializeDBs() {
  console.log('Connecting to PostgresDB');
  pgClient = await pgPool.connect();

  console.log('Connecting to MongoDB');
  await mgClient.connect();
}

async function cleanDB() {
  console.log('Cleaning MongoDB database');
  try {
    await mgClient
      .db('license')
      .collection('curriculum')
      .drop();
  } catch(e) {
    console.warn(`Unable to clean database: ${e.message}`);
  }
}

async function finalizeDBs() {
  console.log('Disconnecting from PostgresDB');
  await pgClient.release();
  console.log('Disconnecting from MongoDB');
  await mgClient.close();
}

run().catch(console.error)