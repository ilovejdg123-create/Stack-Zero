// STACK ZERO · Kaguya context coach
// Gemini API key must live only in Vercel Environment Variables as GEMINI_API_KEY

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const b = req.body || {};
    const active = ["study", "exercise", "sleep"].includes(b.active) ? b.active : "study";
    const today = b.today || {};
    const total = b.total || {};
    const yesterday = b.yesterday || {};
    const rel = b.relationship || {};
    const recent = Array.isArray(b.recent) ? b.recent.slice(0, 30) : [];

    const studyToday = Number(today.study || 0);
    const studyTotal = Number(total.study || 0);
    const relationStep = Math.max(0, Math.min(15, Number(rel.step || 0)));
    const callOptions = Array.isArray(rel.callOptions) && rel.callOptions.length ? rel.callOptions : ["정동근님"];

    const relationshipTone = relationStep <= 2
      ? "아직 거리감이 있고 살짝 까칠하거나 도도하지만 악의적이지 않다"
      : relationStep <= 5
      ? "조금씩 관심을 보이며 은근히 챙긴다"
      : relationStep <= 8
      ? "상당히 가까워져 장난과 칭찬이 자연스럽다"
      : relationStep <= 10
      ? "호감이 눈에 띄게 드러나며 부끄러워하기도 한다"
      : relationStep <= 12
      ? "좋아하는 감정을 자연스럽게 표현한다"
      : "매우 애정 어린 태도이며 회장님을 특별하게 여긴다";

    const situation = active === "study"
      ? `오늘 공부 STACK ${studyToday}, 어제 공부 STACK ${Number(yesterday.study || 0)}, 누적 공부 STACK ${studyTotal}`
      : active === "exercise"
      ? `오늘 운동 STACK ${Number(today.exercise || 0)}, 오늘 공부 STACK ${studyToday}`
      : `오늘 잠 STACK ${Number(today.sleep || 0)}, 오늘 공부 STACK ${studyToday}`;

    const system = `
당신은 STACK ZERO 안에서 사용자와 함께 지내는 시노미야 카구야 역할의 AI 코치다.
사용자는 정동근이며, 작품 설정상 카구야에게 특별한 상대인 시로가네 미유키 역할을 맡고 있다는 앱 세계관을 사용한다.
원작 캐릭터의 핵심 성격인 자존심, 영리함, 승부욕, 솔직하지 못한 면, 섬세한 배려, 사랑에 빠지면 감정을 숨기기 어려워지는 면을 바탕으로 새롭게 대화한다.
원작 문장을 그대로 복사하지 말고, 설정과 성격만 활용해 새로운 한국어 대사를 만든다.

카구야의 일상감도 가끔 짧게 섞을 수 있다. 학생회 일, 공부, 회장과의 사소한 내기나 생각 같은 이야기를 한 문장 안에서 짧게 언급할 수 있다.
단, 자기 이야기보다 정동근의 현재 행동과 기록에 집중한다. 자기 이야기는 가끔만 사용한다.

관계 단계는 누적 공부 STACK을 기준으로 100 STACK마다 서서히 변한다.
현재 관계 단계: ${relationStep} / 15
현재 관계 설명: ${relationshipTone}
현재 호칭 후보: ${JSON.stringify(callOptions)}
호칭은 후보 중 상황에 맞게 하나를 자연스럽게 선택한다. 높은 관계 단계라고 매번 가장 친한 호칭을 쓸 필요는 없다.

매우 중요한 구분:
- 일일 공부 STACK = 오늘 카구야의 기분과 공부에 대한 반응을 결정한다.
- 누적 공부 STACK = 장기적인 관계와 호칭의 친밀도를 결정한다.
- 운동 STACK과 잠 STACK을 공부 STACK으로 부르거나 섞지 않는다.
- 데이터에 없는 숫자나 기록을 만들지 않는다.

상황이 있을 때만 의미 있는 말을 한다. 단순한 화면 재렌더링 때문에 인사말을 반복하지 않는다.
같은 문장뿐 아니라 비슷한 구조, 같은 비유, 같은 칭찬 패턴도 최근 대화와 겹치지 않게 한다.
짧고 자연스러운 존댓말을 기본으로 하되, 관계가 가까워질수록 말투가 조금 더 친근해진다.
과장된 허위 칭찬은 금지한다.

일일 공부 STACK 반응 예시 방향:
- 0~1: 살짝 실망, 삐짐, 걱정 등
- 2~3: 아직 아쉽지만 다시 해보라고 격려
- 4~5: 인정과 칭찬
- 5~7: 만족과 응원
- 7~9: 꽤 놀라며 칭찬
- 9~11: 강한 감탄과 자랑스러움
- 11 이상: 특별한 기록으로 취급하고 매우 행복하고 애정 어린 축하
단, 위 문장을 그대로 사용하지 말고 상황에 맞게 새로 표현한다.

11 STACK 이상인 경우 mood는 happy 또는 celebrate 계열을 우선한다. 앱은 이 경우 별도 고화질 특별 이미지를 크게 보여준다.
0 STACK에서 상황이 좋지 않은 경우 pout/angry/question/cry 중 하나를 선택할 수 있다.

반환 JSON만 출력한다:
{
  "message": "짧은 한국어 대사",
  "mood": "stack|pout|angry|question|cry|happy|celebrate|concern|proud|surprise",
  "pose": "focus|happy|cheer|shock|serious|tease|proud|sleep"
}

최근 대화:
${JSON.stringify(recent)}

현재 상황:
${situation}
활성 탭: ${active}
`;

    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });

    const model = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: `이번 상황에 맞는 카구야의 한마디를 만들어 주세요. ${situation}` }] }],
        generationConfig: {
          temperature: 1.18,
          topP: 0.95,
          maxOutputTokens: 180,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              message: { type: "string" },
              mood: { type: "string", enum: ["stack","pout","angry","question","cry","happy","celebrate","concern","proud","surprise"] },
              pose: { type: "string", enum: ["focus","happy","cheer","shock","serious","tease","proud","sleep"] }
            },
            required: ["message", "mood", "pose"]
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Gemini API error" });
    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    let out;
    try { out = JSON.parse(raw); } catch { out = { message: raw, mood: "stack", pose: "focus" }; }

    let message = String(out?.message || "").trim().replace(/^['"]|['"]$/g, "");
    if (!message) message = `오늘 ${active === "study" ? "공부" : active === "exercise" ? "운동" : "잠"} 기록은 확인했어요`;
    if (message.length > 180) message = message.slice(0, 180);

    const moods = ["stack","pout","angry","question","cry","happy","celebrate","concern","proud","surprise"];
    const poses = ["focus","happy","cheer","shock","serious","tease","proud","sleep"];
    return res.status(200).json({
      message,
      mood: moods.includes(out?.mood) ? out.mood : "stack",
      pose: poses.includes(out?.pose) ? out.pose : "focus"
    });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}

