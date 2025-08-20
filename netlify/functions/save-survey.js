// netlify/functions/save-survey.js
// PostgreSQL 클라이언트 라이브러리를 불러옵니다.
const { Client } = require('pg');

/**
 * Netlify Functions의 메인 핸들러 함수입니다.
 * HTTP POST 요청을 처리하여 설문 데이터를 데이터베이스에 저장합니다.
 * @param {object} event - HTTP 요청에 대한 정보를 담고 있는 객체
 * @param {object} context - Netlify Functions의 실행 환경에 대한 정보를 담고 있는 객체
 * @returns {object} - HTTP 응답 객체 (성공 또는 실패 메시지 포함)
 */
exports.handler = async (event, context) => {
  // POST 요청이 아니면 405 Method Not Allowed 에러를 반환합니다.
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // 요청 본문(body)의 JSON 데이터를 파싱하여 변수에 할당합니다.
  const { userName, userPhone, answers, analysisResult } = JSON.parse(event.body);

  // Netlify 환경 변수 NETLIFY_DATABASE_URL을 사용하여 PostgreSQL 클라이언트를 생성합니다.
  // 이 환경 변수는 Netlify 프로젝트 설정에서 직접 등록해야 합니다.
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // 데이터베이스에 연결합니다.
    await client.connect();
    
    // 설문 데이터를 user_survey 테이블에 삽입하는 SQL 쿼리입니다.
    // $1, $2, $3, $4는 SQL 인젝션을 방지하기 위한 매개변수입니다.
    const query = `
      INSERT INTO user_survey (user_name, user_phone, answers, analysis_result)
      VALUES ($1, $2, $3, $4)
    `;
    // INSERT 쿼리에 들어갈 값들을 배열로 정의합니다.
    const values = [userName, userPhone, JSON.stringify(answers), JSON.stringify(analysisResult)];
    
    // 쿼리를 실행하여 데이터를 저장합니다.
    await client.query(query, values);

    // 데이터 저장 성공 시 200 상태 코드와 성공 메시지를 반환합니다.
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Survey data saved successfully!' })
    };
  } catch (error) {
    // 데이터베이스 작업 중 오류가 발생하면 에러를 기록하고 실패 메시지를 반환합니다.
    console.error('Database error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to save survey data.', error: error.message })
    };
  } finally {
    // try-catch 블록이 끝나면 데이터베이스 연결을 항상 종료합니다.
    await client.end();
  }
};