// netlify/functions/load-survey.js
const { Client } = require('pg');

exports.handler = async (event, context) => {
  // 환경 변수에서 Netlify DB 연결 문자열을 가져옵니다.
  const client = new Client({
    connectionString: process.env.NETLIFY_DATABASE_URL
  });

  try {
    // 데이터베이스 연결
    await client.connect();
    
    // user_survey 테이블에서 모든 데이터를 최신 순으로 가져옵니다.
    // id, user_name, user_phone, answers, analysis_result, created_at 필드를 모두 포함합니다.
    const query = `
      SELECT id, user_name, user_phone, answers, analysis_result, created_at 
      FROM user_survey 
      ORDER BY created_at DESC
    `;
    const res = await client.query(query);

    // 성공적으로 데이터를 불러오면 JSON 형태로 반환합니다.
    return {
      statusCode: 200,
      body: JSON.stringify(res.rows)
    };
  } catch (error) {
    // 오류가 발생하면 콘솔에 에러를 기록하고 실패 메시지를 반환합니다.
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to load survey data.', error: error.message })
    };
  } finally {
    // 데이터베이스 연결을 종료합니다.
    await client.end();
  }
};
