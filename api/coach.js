// Vercel serverless function: /api/coach
// Put OPENAI_API_KEY in Vercel Project Settings -> Environment Variables.
// Never put the key in index.html or localStorage.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body || {};
    const active = ["study","exercise","sleep"].includes(body.active) ? body.active : "study";
    const today = body.today || {};
    const total = body.total || {};
    const level = body.level || "뉴비";
    const recent = Array.isArray(body.recent) ? body.recent.slice(0,6) : [];
    const quests = Array.isArray(body.quests) ? body.quests.slice(0,8) : [];

    const system = `
당신은 STACK ZERO의 개인 코치다.
반드시 한국어 존댓말을 사용한다.
한 번에 1~2문장, 최대 180자다.
친근하지만 유치하지 않고, 실제 코치처럼 말한다.
사용자가 듣기 좋은 말만 하지 말고 현재 데이터에 맞춰 현실적으로 말한다.
가장 중요한 규칙: 공부/운동/잠 STACK을 절대로 혼동하지 않는다.
현재 탭이 ${active}이면 그 탭의 '오늘 STACK'을 말할 때만 그 숫자를 사용한다.
레벨/호칭은 누적 공부 STACK 기준이다.
없는 사실, 하지 않은 행동, 임의의 수치를 만들어내지 않는다.
최근 문구와 똑같거나 거의 같은 표현을 반복하지 않는다.
퀘스트가 있으면 필요할 때만 자연스럽게 언급한다.
`;

    const input = `
현재 탭: ${active}
오늘 STACK: 공부 ${today.study||0}, 운동 ${today.exercise||0}, 잠 ${today.sleep||0}
누적 STACK: 공부 ${total.study||0}, 운동 ${total.exercise||0}, 잠 ${total.sleep||0}
현재 공부 레벨: ${level}
최근 코치 문구: ${JSON.stringify(recent)}
현재 탭의 퀘스트: ${JSON.stringify(quests)}
위 정보를 바탕으로 지금 사용자에게 해줄 한마디를 만들어라.
`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions: system,
        input,
        max_output_tokens: 100
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({error: data?.error?.message || "OpenAI API error"});
    }

    return res.status(200).json({message: data.output_text || "오늘도 차근차근 STACK을 쌓아봅시다"});
  } catch (err) {
    return res.status(500).json({error: String(err.message || err)});
  }
}
