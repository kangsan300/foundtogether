// PostgreSQL 클라이언트 라이브러리를 불러옵니다.
const { Client } = require('pg');

/**
 * Netlify Functions의 메인 핸들러 함수입니다.
 * @description HTTP GET 요청을 처리하여 user_survey 테이블에 저장된 데이터를 불러옵니다.
 * 데이터베이스에서 설문 데이터를 최신 순으로 가져와 JSON 배열 형태로 반환합니다.
 * @param {object} event - HTTP 요청에 대한 정보를 담고 있는 객체
 * @param {object} context - Netlify Functions의 실행 환경에 대한 정보를 담고 있는 객체
 * @returns {object} - HTTP 응답 객체 (데이터 또는 실패 메시지 포함)
 */
exports.handler = async (event, context) => {
  // CORS(Cross-Origin Resource Sharing)를 위한 헤더를 설정합니다.
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  // OPTIONS 요청(사전 요청)에 대한 응답을 처리합니다.
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET 요청이 아니면 405 Method Not Allowed 에러를 반환합니다.
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }
  
  let client;

  try {
    // 환경 변수 NETLIFY_DATABASE_URL이 설정되었는지 확인합니다.
    if (!process.env.NETLIFY_DATABASE_URL) {
      throw new Error('NETLIFY_DATABASE_URL 환경 변수가 설정되지 않았습니다.');
    }

    // Netlify 환경 변수를 사용하여 PostgreSQL 클라이언트를 생성합니다.
    client = new Client({
      connectionString: process.env.NETLIFY_DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });

    // 데이터베이스에 연결합니다.
    await client.connect();
    
    // user_survey 테이블에서 모든 데이터를 생성일(created_at) 기준으로 최신 순으로 가져옵니다.
    const query = `
      SELECT id, user_name, user_phone, answers, analysis_result, created_at 
      FROM user_survey 
      ORDER BY created_at DESC
    `;
    const res = await client.query(query);

    // 성공적으로 데이터를 불러오면 JSON 형태로 반환합니다.
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(res.rows)
    };
  } catch (error) {
    // 데이터베이스 작업 중 오류가 발생하면 에러를 기록하고 실패 메시지를 반환합니다.
    console.error('Database error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Failed to load survey data.', error: error.message })
    };
  } finally {
    // try-catch 블록이 끝나면 데이터베이스 연결을 항상 종료합니다.
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  }
};