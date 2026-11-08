> DRAFT revision 3 agent — chưa triển khai/chưa cân bằng; bộ ảnh minh họa 2D trio v3 đã bàn giao, PM duyệt contact sheet cho síp review; không cần Blender/3D. Cập nhật 08/11/2026 (Asia/Saigon). Thay thế proposal một Bạn Code 600.000đ; mọi stats là thiết kế game chờ síp duyệt, không số liệu vendor.

## 1. Phạm vi mới: đúng 3 AI coding agent

**Mục tiêu:** người chơi mua trợ lý phần mềm để bớt thao tác coding, nhưng tự chọn ai sửa bug và tự nhấn **Xong** mới giao bài/nhận thưởng.

- MVP gồm đúng **3 agent**, lấy cảm hứng Claude, Cursor, GitHub Copilot; mỗi agent có giá, thời gian code/fix và tỷ lệ bug khác nhau. Tên hiển thị **Mọt Mơ / Vút Vít / Kính Bay** dùng theo bộ Art đã được PM chấp nhận cho design; **ID ổn định** `claude_inspired`, `cursor_inspired`, `copilot_inspired` dùng ghép asset/config, không đổi theo tên.
- Đây là mô phỏng game, không tích hợp sản phẩm/provider thật. Tốc độ, giá và xác suất dưới đây chỉ là **đề xuất cân bằng**, không benchmark/claim về Claude, Cursor hoặc GitHub Copilot. Không token/subscription/phí lượt/API key/tiền thật.
- Cả 3 đều **code và fix**; không khóa utility theo tier. Mua đứt mỗi license một lần; có thể sở hữu cả 3, chọn một coder mỗi run và một fixer mỗi lần xử lý bug. Không auto-accept/auto-submit, không chạy nền/parallel.
- Manual luôn dùng được, không cần mua. Người chơi nhận → mở task → chọn tự làm/agent → coding → chọn tự fix/agent fix nếu có bug → **Xong**.
- **Theo chỉ đạo síp: AI chỉ cần ảnh minh họa đẹp, không cần asset 3D/Blender.** Trio v3 đã bàn giao đủ ảnh generate gốc + PNG alpha 512/256/64, PM xem contact sheet và chấp nhận 2D illustration cho síp review: viền mực đen ấm, sách/kính to, con trỏ tinh nghịch, mây/kính phi công nháy mắt. IDs/tên và balance không đổi. Gói hiện hành: `/workspace/devlife-ai-agent-design/devlife-ai-agent-trio-2d-review.zip`; bộ v2 3D và yêu cầu editable scene đã superseded, giữ nguyên lịch sử. Không thêm robot trong phòng/không sửa CustomizePanel.tsx.

## 2. Hiện trạng đã đối chiếu (facts)

Đọc chỉ bằng GitHub tools trên `main` tại **b697ba3badb1158865dd7222ec3f4e8b5519d561**; không clone, không chạy repo, không kiểm chứng tương tác live. Nguồn chính là snapshot code này; tài liệu cũ chỉ bổ sung ngữ cảnh.

| Mảng | Hiện có | Nguồn |
| --- | --- | --- |
| Shop | Hai chế độ Cửa hàng / Đã sở hữu; danh mục Nội thất / Phòng / Tất cả. Ownership và nút Mua/Đã có; đồ đã sở hữu có logic đặt phòng, không phù hợp để dùng nguyên cho license AI. Ảnh shop 3D render mịn ở 64px. | StorePanel.tsx, store-shelf.ts, store-grid.config.ts |
| Nhận / mở job | Board có Nhận, job active có Tiếp tục. Phân biệt nhận job với mở task; overlay task có ticket/build/test/result. | JobBoardPanel.tsx, TaskRunOverlay.tsx, state/store.ts |
| Coding | Ticket có correct/wrong/ask; build chạy tự động, dừng ở khoảng 40% để chọn làm kỹ/làm ẩu. Không có trình soạn code thật mà người chơi phải gõ từng ký tự. “AI code” là tự động hoá lựa chọn và đoạn mô phỏng này. | TaskRunOverlay.tsx, task_run.json |
| Bug | Test bắt bug bằng click/tap, hit target 44px. Config test 10s, build 15s; max retry 1, retry_energy cơ sở 6, fail_reputation 1. Thực tế có modifier trait/đồ/mood; không coi 6 là chi phí cuối cố định. | task_run.json, task-run/apply.ts |
| Thành công | Bắt hết bug hiện gọi grantTaskSuccess, hoàn tất job và cấp thưởng ngay; màn kết quả ghi Đã giao cho khách và chỉ có đóng. **Đây là điểm phải đổi**, không chỉ đổi nhãn nút đóng thành Xong. Company task không trả tiền freelance/không tăng freelance_completed, vẫn có XP/uy tín. | task-run/apply.ts, TaskRunOverlay.tsx |
| Save | PERSIST_VERSION **26**, không suy từ bộ nhớ. Run được lưu trong player_jobs.task_run; Zustand dùng migrateSave. | game/config.ts, state/store.ts |
| Day 1 | study → bell → jobs; input khóa ngoài luồng. openingDone hiện bật khi mở/bắt đầu task ở bước jobs, không đợi task thành công. | opening/flow.ts, state/store.ts |

Notion đã đọc: trang dự án devlife (có nội dung thật; không dùng trang template trống cùng tên) và thiết kế Đầu ngày 1. Trang Notion cũ mô tả pixel 2D, version 25 và flow nhiều bước — **đã lỗi thời so với main**, không lấy làm đặc tả hiện hành. docs/systems/task-run.md cũng còn ghi save v5, docs/systems/time.md còn metadata v2; version chuẩn là config.ts = 26.

## 3. Luồng màn hình mới (đề xuất)

### A. Cửa hàng → tab “AI Agent”

Giữ Cửa hàng / Đã sở hữu; thêm danh mục AI Agent cạnh Nội thất / Phòng / Tất cả. Tất cả hiện AI thành nhóm riêng; Đã sở hữu có nhóm license AI, không có đặt vào phòng. Tab có **đúng 3 card** theo bảng cân bằng mục 4.1, không phải chỉ một Bạn Code và không cần mua theo thứ tự.

Mỗi card: avatar 64px, tên vui + loại Coding Agent, giá mua một lần, sở hữu/Sẵn sàng/Đang giúp task [tên], và **ba dòng so sánh cùng thứ tự**:
- **Thời gian code/fix:** ×0,90 / ×0,55 / ×1,10 so với nền tương ứng; nhỏ hơn = nhanh hơn. Có thể thêm “nhanh hơn 10% thời gian” nhưng không gọi ×0,55 là tốc độ ×0,55.
- **Bug:** “25% / 80% / 60% mỗi bug tiềm năng còn lại” + tooltip định nghĩa ở mục 4.2. Không ghi số này thành xác suất có bug trên mọi task.
- **Giá:** 900.000đ / 1.200.000đ / 180.000đ; ghi “Cân bằng thử nghiệm”. Chip Nhẹ bug / Chạy lẹ / Dễ mua không thay số.

Đề xuất mở **cả ba** sau một job freelance thành công (`freelance_completed >= 1`); không bắt mua rẻ trước. Kính Bay 180.000đ là entry sớm, bằng mức công job landing-html được ghi trong tài liệu lịch sử; không bảo đảm số dư sau sinh hoạt đủ mua. Đây là lựa chọn giá/gate chờ síp review, không thay gate shop cũ.

Bấm Mua → “Mua [tên] với [giá hiện tại]?” + số dư trước/sau + mua đứt/không tự giao → Hủy / Xác nhận mua. Chỉ confirm trừ tiền và ghi unique ownership theo ID nguyên tử; thiếu tiền/đã có/lặp click no-op có lý do. Sau mua không tự chạy task. Không discount/upgrade/resale trong MVP.

### B. Nhận → mở task → chọn cách làm

Trước ticket, hiện yêu cầu/skill/thưởng dự kiến và **Tự làm / Dùng Coding Agent**. Picker hiển thị cả 3 card cùng bộ số shop; card chưa mua disabled + Xem cửa hàng AI, card có license chọn được. Không tự chọn agent đắt nhất.

Khi chọn một agent, thêm **preview theo task thực tế**: code dự kiến bao nhiêu giây, AI fix nếu có bug bao nhiêu giây, tỷ lệ có ít nhất 1 bug và số bug kỳ vọng, năng lượng hiệu lực, lý do modifier và badge “dự kiến trước event”. Mục 4.2 định nghĩa phép tính. Có thể đổi lựa chọn trước Bắt đầu với [tên], không trừ phí. Tự làm hiện nền manual để so, không hiển thị xác suất bắt bug thành công của người chơi.

Chưa mua AI vẫn đi manual đầy đủ. Xem shop rồi trở về giữ task/picker nhưng không tự chạy. Skill/energy/burnout gate như cũ, AI không lách và không tự Cố làm. Nhận/mở/picker không trừ năng lượng; chỉ xác nhận bắt đầu run trừ chi phí hiệu lực một lần.

### C. Agent đọc → chọn → code

CRT `[AI] [tên] · Đang đọc / Đang code`; auto đọc/hiển thị quyết định 5s (baseline proposal dùng ticket_sec), chọn ticket `correct` và build `careful`. **Sau các lựa chọn này vẫn áp dụng multiplier thời gian và phép lọc bug riêng theo agent ở mục 4**, không còn policy “chỉ correct/careful, không modifier AI”. Event/trait/mood/skill/đồ vẫn ảnh hưởng nền trước multiplier/lọc.

Coder khóa sau khi bắt đầu: dừng có thể tiếp agent cũ hoặc tự làm tiếp **cùng run/progress**; không đổi coder/reroll chất lượng mid-build. Agent stats snapshot giữ cho đoạn code đang dở kể cả chuyển tiếp thủ công, không dùng chuyển mode để chạy lại nhanh/reroll. Log/typing chỉ minh họa; không cần nhập code/prompt thật. Dừng/đóng/ẩn tab → checkpoint; không phí lần hai.

Build xong tạo đúng một bug set N theo seed. N = 0 → Chờ Xong, không hiện gate sửa giả. N > 0 → dừng **Có N bug. Ai sửa?**, chưa tự sửa.

### D. Bug gate → manual hoặc chọn fixer

**Tự sửa:** minigame hiện tại với timer cơ sở 10s × timeScale. **Nhờ Agent sửa:** picker 3 agent đã sở hữu, mỗi card cho thời gian còn lại hiệu lực; coder và fixer có thể khác nhau. Bug stats trong picker fixer ghi rõ “Chỉ áp dụng khi agent code; đổi fixer không thay bug đã có”. Chưa sở hữu/không sẵn sàng thì có lý do; không bắt mua.

AI fix sửa chắc chắn bug set đã tồn tại, không roll lỗi sửa/reroll bug. **Tốc độ fixer** ảnh hưởng duration qua m_fixer, không dùng m_coder. Cùng agent code/fix là lựa chọn mặc định gợi ý, **không tự chạy**. Không phí theo lượt; không XP/tiền cho mỗi bug.

Đổi fixer, retry, pause:
- Work sửa chuẩn hóa tổng 1 cho N bug ban đầu, mỗi bug có trọng số 1/N; lưu ID + phần work còn lại cho bug đang sửa. AI tiêu work theo 1/(10 × timeScale × m_fixer) mỗi giây; sửa bug tuần tự bằng ID ổn định. Manual bắt một bug loại hết work còn lại của bug đó. AI thời gian còn lại = workRemaining × 10 × timeScale × m_fixer. Với N > 0 chưa xử lý, AI fix toàn bộ = 10 × timeScale × m_fixer, không nhân thêm N.
- Manual có **ngân sách timer riêng** 10 × timeScale giây mỗi attempt, chỉ giảm khi đang manual active; AI chạy thì manual timer dừng nhưng không reset. Chuyển AI↔manual hoặc giữa fixer giữ đúng work/fixed IDs/partial bug/manual time còn lại, không cấp lại lượt và không đổi xác suất. Phần sửa chưa hoàn thành vẫn phải làm, không lấy progress% thời gian manual để tự xóa bug.
- Manual hết giờ còn bug → fail đầu; Retry yêu cầu confirm + đủ chi phí năng lượng hiệu lực, trừ một lần và tiêu 1 retry theo config. **Đề xuất mới rõ ràng:** retry cấp lại timer manual, giữ bug IDs chưa sửa/partial work và các bug đã fix, không code lại/roll lại seed/event/q/N. Sau retry được chọn manual/AI fixer. Không còn câu mơ hồ “reset test theo cũ” mâu thuẫn với giữ work.
- Hết lượt manual fail → final failure/phạt hiện hành một lần; không cho Agent cứu sau final fail. Lỗi kỹ thuật thì pause/fallback, không gameplay fail/tiêu retry.
- Dừng/Để sau/Esc không tự chọn fixer hay phát thưởng. Deadline game vẫn chạy theo luật chung; AI sửa không đóng băng deadline.

### E. Sạch bug → Chờ bạn nhấn Xong

Cả manual/AI/N=0 đều vào `ready_to_finish`, hiện coder/fixer/thưởng dự kiến + **Xong / Để sau**, dòng “Chưa giao cho khách, chưa nhận thưởng”. Không gọi grantTaskSuccess khi bắt hết bug hay hết progress.

Chỉ Xong hợp lệ mới commit completed/reward/milestone/cue đúng một lần. Esc/reload giữ READY, agent đã rảnh; mở lại không auto-submit. Company task giữ 0 tiền công freelance/không tăng freelance count. Sau commit mới ghi Đã giao và nút Đóng. Auto nhận/submit để capability riêng về sau, không thuộc bất kỳ agent MVP nào.

## 4. Cân bằng 3 agent và định nghĩa xác suất (toàn bộ là đề xuất)

### 4.1. Bảng đề xuất để Art/PM cùng ghép ID

**Không phải số liệu sản phẩm thật; tên Art dùng cho design, stable ID giữ nguyên.** `m` là hệ số thời gian code và AI fix (thấp hơn nhanh hơn); `q` là xác suất từng bug tiềm năng còn lại sau agent code, KHÔNG phải mỗi lần sửa hay fail task.

| ID / cảm hứng | Tên Art / màu asset đã bàn giao | Giá tiền game | m code & fix | q mỗi bug tiềm năng | Lợi / hại |
| --- | --- | --- | --- | --- | --- |
| claude_inspired / Claude | Mọt Mơ — cam đất/kem | 900.000đ | 0,90 (tốc độ ≈1,11× nền) | 25% | Ít bug nhất, bớt gánh khi tự fix; code/fix chậm hơn Vút Vít, vốn cao hơn Kính Bay. “Đọc kỹ rồi mới dám Enter”. |
| cursor_inspired / Cursor | Vút Vít — than đen/trắng, mắt sáng | 1.200.000đ | 0,55 (≈1,82×) | 80% | Nhanh nhất cả code/fix, đắt nhất và nhiều bug hơn nếu chọn tự sửa. “Chạy nhanh, bug chạy theo”. |
| copilot_inspired / GitHub Copilot | Kính Bay — mây trắng, kính xanh lá/mint | 180.000đ | 1,10 (≈0,91×) | 60% | Mua sớm, ít bug hơn Vút Vít nhưng chậm nhất; vẫn có đủ code/fix. “Ví mỏng có bạn đồng hành”. |

Không agent nào bị khóa fix/code; không strict tier bắt mua tuần tự. Vút Vít thắng tốc độ nhưng thua chi phí/bug; Mọt Mơ thắng chất lượng, Kính Bay thắng giá. Manual giá 0, không tiêu license, giữ lựa chọn nhanh/ẩu và minigame chủ động; không giảm XP/năng lượng riêng để ép mua.

### 4.2. Chỉ một model bug: lọc từng bug tiềm năng

**Facts nền đã đọc:** config task_run.json: build_sec=15, careful_extra_sec=+4, rushed_extra_sec=-4, test_sec=10, ticket_sec=5, bugs min=1/max=4, event_chance=0,65; formula đếm bug còn có difficulty, skill, ticket/build, event, mood/trait. Đây không phải hệ thống xác suất q AI đã tồn tại.

**Proposal:**
1. Tính **B** bằng công thức hiện hành, với mọi modifier skill/difficulty/ticket/build/event/mood/pending/trait đúng một lần; giữ clamp nền theo config hiện tại 1..4. AI chọn correct/careful nên nhận hiệu ứng của chúng trước, không bỏ modifier người chơi. Manual dùng B trực tiếp, không thêm q.
2. Agent code: mỗi bug tiềm năng i trong 1..B giữ lại độc lập khi U_i < q_coder; N = tổng bug giữ lại. **N nằm 0..B (tối đa 4 hiện tại)**; không clamp N lên min=1 lần nữa, nếu không q bị vô hiệu trên task dễ. Không có thêm roll “có bug cả build”, không roll mỗi lần fix, không thêm bug do fixer.
3. E[N] = Bq; P(có ít nhất 1 bug) = 1 − (1−q)^B. N > 0 mới hiện lựa chọn ai sửa. N=0 không tự lĩnh thưởng, vẫn phải Xong.
4. Seed deterministic: tạo U_i từ run.seed + namespace coding-quality + coder stable ID + potentialBugIndex; snapshot catalog version/q/B và lưu surviving bug IDs/N sau build. Không dùng retry count, fixer ID, clock hay Math.random. Cùng save/seed/coder giữ kết quả qua pause/reload/retry. Coder khóa trước roll, không “đổi agent thử vận”. Event có namespace seed riêng như hiện có, không random lại khi đổi fixer.
5. UI shop dùng q với tooltip. Picker **trước event** hiển thị range theo các event khả dĩ đã cấu hình và modifier hiện tại: [min P_any(B_event), max P_any(B_event)], E[N] range tương tự; không roll/tiết lộ seeded event sớm. Nếu B không đổi, hiện một số. Sau event được reveal, preview chuyển B_eff chính xác, sau build hiện N thật. Không lấy event_chance 0,65 làm bug chance; không giả định event phân bố đều để cho một số trung bình thiếu căn cứ.

Ví dụ B=1: P_any = 25%/80%/60%, E[N]=0,25/0,8/0,6. B=4: P_any ≈68,36%/99,84%/97,44%, E[N]=1/3,2/2,4. Vì vậy label “Bug 25%” đứng một mình là sai ngữ nghĩa.

### 4.3. Thời gian, preview và sanity check

Code nền **T_build_base** = tổng duration pre-choice + post-choice hiện hành, đã áp dụng timeScale, ask/event delta, careful/rushed delta và các floor hiện hành đúng một lần. Agent nhân **toàn bộ build duration đó** với m_coder, không chỉ typing log; tiến độ theo work fraction. Fixed read/decision intro = ticket_sec=5s (proposal, không tự nhận rằng hiện có timeout ticket).

AI fix duration = workRemaining × (test_sec × timeScale) × m_fixer. Cùng một m của từng agent dùng cả code và fix; không có nghĩa manual test timer cũng bị nhân m của coder. Code đã đi qua checkpoint không bị tính lại theo m_fixer. Nếu tương lai cần floor duration, cập nhật catalog model/version; bản đề xuất này không thêm floor AI khác ngoài nền.

**Ví dụ tính kiểm tra, không phải benchmark:** timeScale=1, không event/ask/trait/mood/đồ hoặc pending delta, ticket correct + build careful, B=1. Build nền=15+4=19s; manual test budget=10s. Không tính thời gian người chơi cân nhắc/bấm nút/Xong, retry hay fail. Nếu coder và fixer cùng agent, E[T] = 5 + 19m + P_any × 10m.

| Cách làm | Code sau intro | Fix nếu có bug | P_any (B=1) | E[T] gồm intro và nhánh bug |
| --- | --- | --- | --- | --- |
| Manual correct/careful | 19s | ≤10s nếu tự bắt thành công | 100% theo min nền B=1 | ≤34s nếu thành công lượt đầu, không đoán kỹ năng người chơi |
| Mọt Mơ | 17,10s | 9s | 25% | 24,35s |
| Vút Vít | 10,45s | 5,5s | 80% | 19,85s |
| Kính Bay | 20,90s | 11s | 60% | 32,50s |

Khi B=4 cùng timing giả định, E[T] lần lượt ≈28,25s / 20,94s / 36,62s. Đây là conditional check B=4, không khẳng định task khó/event luôn giữ cùng timing. Khác coder/fixer: E[T]=5+T_build_base×m_coder+P_any×10×timeScale×m_fixer. AI code + manual fix không có một kỳ vọng tổng chắc chắn vì phụ thuộc thao tác/fail/retry; UI chỉ hiện code duration + timer manual + risk.

Trade-off thực: auto-fix chắc chắn khiến speed agent mạnh nếu đã đủ vốn, nên cần playtest ROI/giá và tải manual bug. Không bịa lỗi sửa ngẫu nhiên hay token fee để chữa balance; nếu số liệu test cho thấy dominant pick thì chỉnh ba tham số giá/m/q trước.

### 4.4. Kinh tế / thời gian game / reward giữ đơn giản

- Giá mỗi agent khác nhau theo bảng, mua đứt bằng tiền game; không discount/chi phí dùng, giá là đề xuất chờ síp review. Gate sau job đầu cũng chờ duyệt. Giá cũ 600.000đ của Bạn Code bị **thay thế**, không dùng song song.
- Energy bắt đầu/retry dùng công thức và modifier hiện hành, trừ một lần. Không thêm giảm energy/boost XP/pay theo agent; manual và assisted cùng reward formula. Đây là vốn đổi lấy tiện lợi và tốc độ, không payout bonus.
- Không skipMinutes thêm vì AI; thời gian game tự chạy theo luật chung. Tăng tốc build/fix tiết kiệm thời gian thật và thời gian game tương ứng lúc clock chạy, không nhân thêm giờ task. Pause/chờ chọn/chờ Xong không đóng băng deadline; không offline automation.
- Thưởng chỉ Xong hợp lệ; snapshot dự kiến tại READY, company giữ 0 tiền freelance. Quá hạn/final fail/cancel chặn reward, phạt/effect một lần. Nhập viện/kiệt sức cưỡng chế dừng automation giữ checkpoint nếu job còn hợp lệ.

## 5. Concurrency, stop và save/reload (hợp đồng cần có)

- **Mỗi người chơi chỉ 1 task đang thực thi ở một thời điểm**, dù có nhiều job đã nhận. Không queue/parallel. Agent được chọn chiếm dụng chỉ lúc coding/fixing; sở hữu 3 agent không mở 3 task song song. Màn chọn bug, Chờ Xong, tạm dừng không giữ agent bận.
- Mở task khác khi đang chạy: hiện “Đang làm [tên]. Tiếp tục / Tạm dừng và mở task này”. Xác nhận tạm dừng mới nhả agent; không âm thầm đổi task.
- Đóng/Esc/ẩn tab/reload: lưu phase + progress + bug IDs đã sửa + test time còn lại, nhả busy; lần mở sau hiện **Tiếp tục**, không auto-run. Không tính thời gian vắng mặt, không chạy callback cũ. Thời gian game giữ chính sách chung, không bịa thêm offline advance.
- Hủy trong picker/confirm mua/confirm retry: không đổi phase, không phí. **Dừng** không đồng nghĩa bỏ job, không hoàn lại năng lượng đã dùng, không reset seed/retry. MVP không thêm thao tác xóa run; nếu có lệnh hủy job của hệ thống thì dùng terminal cancelled và loại hết callback đang bay, 0 thưởng.
- Hai tab cùng save: giới hạn một tab có quyền ghi/chạy, tab phụ read-only với thông báo “Game đang mở ở tab khác”. Lock chuyển quyền khi tab chủ đóng/hết lease; bắt đầu/Xong/mua phải kiểm tra ownership lock, không chỉ disable nút. Đây là đề xuất cần kiểm thử, không khẳng định code hiện tại đã bảo đảm.
- Mua double click: ownership unique + trừ tiền/ghi license nguyên tử; repeat command là no-op. Thiếu tiền hoặc save chưa sẵn sàng thì không trừ.
- Run identity và revision/attempt identity dùng để loại event trùng/cũ. Cùng bug ID chỉ được đếm một lần; cùng start/retry ID chỉ trừ năng lượng một lần. Worker/timer không được tự gọi grant reward.
- Xong double click/reload/event lặp: guard `ready && !completionCommitted`; commit job status, tiền, XP, uy tín, freelance count, milestone, purse/event/cue cùng một transition. Retry callback cũ sau Xong/fail/cancel là no-op. Không chỉ dựa vào trạng thái UI đang mở.

## 6. Day 1: không phá luồng đã chốt

Giữ đúng Học nhấp nháy → học → chuông nhấp nháy → nhận job → đóng popup → Việc làm nhấp nháy → mở/làm job. Không thêm mua AI vào bước này, không cho deep-link shop xuyên OpeningLock/data-opening-allow.

- Job freelance đầu tiên đi manual; chưa có license và AI chỉ mở sau lần hoàn tất freelance đầu tiên. Nút Tự làm là đường chính; AI khóa kèm lý do, không gài người chơi sang shop.
- openingDone **tiếp tục kết thúc tại mở task** như current main; không sửa thành “xong job” theo Notion cũ. Gate `freelance_completed >= 1` riêng cho AI ngăn shop AI mở sớm chỉ vì openingDone vừa bật.
- Sau Xong của job đầu: toast nhẹ “Đã mở AI Agent trong Cửa hàng”, không modal bắt mua/không làm nhấp nháy thêm luồng cưỡng chế. Thất bại đầu tiên vẫn có thể nhận/làm job khác bằng tay, không kẹt tutorial.
- Save cũ: giữ opening flags; người có freelance_completed >= 1 thấy tab dùng được, người còn 0 vẫn chơi manual rồi mở AI. Không phát miễn phí license.

## 7. Sơ đồ trạng thái (text, đề xuất)

```text
NHẬN JOB (người chơi) -> MỞ TASK -> CHỌN MANUAL / 1 TRONG 3 CODER
 Manual -> TICKET tự chọn -> BUILD tự chọn -> B bug nền ----------+
 Agent -> đọc 5s -> correct/careful -> BUILD thời gian ×m_coder   |
                                   -> lọc B bug theo q_coder -> N|
                    N=0 -----------------------------> READY    |
                    N>0 -> CHỌN NGƯỜI SỬA <---------------------+
                             | Manual test (timer riêng)
                             | 1 trong 3 fixer (work ×m_fixer)
                             +-- giữ IDs/work khi đổi người
 Sạch bug -> READY_TO_FINISH (0 reward) -> người chơi XONG -> COMPLETED + thưởng ONCE
 Manual fail lần 1 -> confirm RETRY + energy -> chọn fixer (không reroll B/N/seed)
 Manual fail hết lượt -> FAILED FINAL + penalty ONCE
 Dừng/đóng/ẩn tab/reload/lỗi kỹ thuật -> PAUSED(checkpoint) -> tiếp cùng work
 Quá hạn/cancel/final-fail -> terminal; callback cũ no-op
```

Agent state: Chưa sở hữu → Sẵn sàng → Đang code/Đang sửa → Sẵn sàng. Cả 3 dùng cùng lifecycle, chỉ khác stats. Chờ chọn/Chờ Xong/paused không giữ busy; một execution toàn game dù sở hữu ba license.

## 8. Save và ranh giới triển khai sau khi duyệt

**Đề xuất schema, không sửa code trong đợt design:**
- Ownership license tách khỏi furniture/loadout: ví dụ `career.agents.ownedIds`; catalog có đúng 3 stable IDs ở bảng 4.1, displayName/assetKey/version, price, durationMultiplier m, perPotentialBugQ và capability `code`, `fix_bug`. Không gộp agent thành slot nội thất.
- Run bổ sung mode/codingAgentId/fixerAgentId/fixMode, coder stats snapshot + quality seed namespace + B + surviving bug IDs/N, remaining normalized fix work từng bug, manual timer còn lại; phase gồm selecting/bug_choice/ready_to_finish, progress checkpoint, remaining test time, fixed bug IDs, retry count, run/attempt/revision IDs, initialCostPaid, reward snapshot và completionCommitted. Chỉ lưu dữ liệu đủ resume, không lưu timer handle/DOM/busy derived.
- Busy suy ra từ run đang chạy do tab writer sở hữu; sau hydrate luôn paused, không giữ ghost busy. Không nhân đôi outcome và reward ledger thiếu nhất quán.
- **Đã kiểm tra current PERSIST_VERSION = 26; khi triển khai bump 26 → 27 + migration**, hoặc bump từ version mới nhất nếu main đã tăng trước lúc code. Phải cập nhật normalize/validate lẫn migrateSave, không chỉ initial state.
- Migration: license rỗng; old completed/result-success đã thưởng giữ nguyên completed/committed, tuyệt đối không dựng lại READY để lĩnh lần hai. Old active run giữ seed/choices/retry, map sang manual, đánh dấu chi phí bắt đầu đã trả nếu run tồn tại; resume paused. Old offered/active chưa có run về chọn cách làm, chưa đánh dấu chi phí đã trả. Giữ đồ/tiền/XP/opening flags cũ.
- Touchpoints dự kiến: StorePanel/store-shelf + catalog agent mới; JobBoardPanel + TaskRunOverlay; task-run machine/apply/types; career state validation, state/store, storage/migrate/config; OpeningLock chỉ kiểm tra tương thích. **Không sửa CustomizePanel.tsx.**
- Về sau agent nhận task hoặc submit task dùng capability riêng và quyền bật/tắt riêng. Không tự cấp `accept`/`submit` cho agent code; MVP không render switch auto-submit vô hiệu hay placeholder mời gọi chưa làm.

## 9. Acceptance scenarios ngắn

1. Hủy mua không mất tiền; thiếu tiền không mua; confirm/double click chỉ một license/một lần trừ; reload vẫn sở hữu.
2. Không mua AI vẫn hoàn thành toàn bộ task manual; chưa đủ skill/energy không dùng AI để lách gate.
3. Với từng ID trong 3 agent, đo đúng build/fix multiplier; kiểm q mỗi potential bug qua nhiều seed (không đòi mọi run bằng tỷ lệ); N=0 bỏ bug gate nhưng vẫn Chờ Xong. Cùng seed/coder/version giữ N qua reload/retry; đổi fixer không reroll.
4. Manual code → Agent fix; Agent code → manual fix đều chạy; không cần bắt đầu lại run.
5. Manual fail lần đầu chỉ trừ retry khi xác nhận; đủ NL retry được chọn ai sửa, thiếu NL giữ nguyên; fail hết lượt phạt đúng một lần, không Agent cứu vô hạn.
6. Agent fix sạch / manual bắt bug cuối → READY, số dư/XP/uy tín chưa tăng; Esc/reload vẫn READY; chỉ Xong mới thưởng một lần, double click không nhân đôi. Company job không thêm tiền/freelance count.
7. Dừng/ẩn tab/reload giữa build/fix giữ checkpoint, không tự tiến offline/không charge lại; đổi fixer giữ timer attempt; lỗi kỹ thuật có fallback và không tiêu retry.
8. Nhiều job đã nhận: chỉ một execution, agent không chạy hai task; tab phụ không được ghi/mua/hoàn tất.
9. READY quá hạn bị chặn Xong và xử lý fail một lần; sự kiện nhập viện dừng run, không âm thầm lĩnh thưởng.
10. Day 1 vẫn chỉ Học → chuông → job; shop deep-link bị khóa đúng lúc, first task manual; Xong đầu tiên mới mở AI. Save v26 completed không nhận lại tiền sau migrate.
11. Mobile 320px: tab không tràn (wrap/scroll có nhãn), card/CTA đọc rõ; bàn phím đi đủ action, focus trap/Esc đúng; reduced-motion không mất status. Bug hitbox tối thiểu 44px vẫn giữ.
12. Đủ 3 mascot đúng ID/màu cảm hứng, đọc ở 24/48/64px/nền sáng tối; shop và picker so sánh đủ giá/m/q cùng ngữ nghĩa, CRT không đổi palette. Đổi fixer sau partial work giữ IDs/work/manual timer; không reset bằng đổi agent. Không robot mới/không động CustomizePanel.

## 10. Nguồn kiểm tra / độ tin cậy

Các liên kết repo dưới đây cùng snapshot `b697ba3`; đường dẫn ghi đầy đủ để agent triển khai tra lại. Đây là đối chiếu sản phẩm, không phải audit runtime hay kết luận lỗi deep behavior.

- [src/components/game/StorePanel.tsx](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/components/game/StorePanel.tsx)
- [src/components/game/store-shelf.ts](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/components/game/store-shelf.ts)
- [src/components/game/store-grid.config.ts](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/components/game/store-grid.config.ts)
- [src/components/game/career/JobBoardPanel.tsx](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/components/game/career/JobBoardPanel.tsx)
- [src/components/terminal/TaskRunOverlay.tsx](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/components/terminal/TaskRunOverlay.tsx)
- [src/game/task-run/types.ts](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/game/task-run/types.ts)
- [src/game/task-run/apply.ts](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/game/task-run/apply.ts)
- [config/task_run.json](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/config/task_run.json)
- [src/game/state/store.ts](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/game/state/store.ts)
- [src/game/config.ts](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/game/config.ts)
- [src/game/opening/flow.ts](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/src/game/opening/flow.ts)
- [docs/systems/task-run.md](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/docs/systems/task-run.md)
- [docs/systems/time.md](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/docs/systems/time.md)
- [docs/design/TERMINAL.md](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/docs/design/TERMINAL.md)
- [public/icons/shop/manifest.json](https://github.com/phuquiivo03/devlife/blob/b697ba3badb1158865dd7222ec3f4e8b5519d561/public/icons/shop/manifest.json)
- <mention url="https://app.notion.com/p/3f4cc14963698143a909dd92a3fdb940">devlife — trang dự án có nội dung</mention> (trang cha; nội dung art/stack cũ không lấn át main).
- <mention url="https://app.notion.com/p/40dcc149636981cd980ee6652e653390">Thiết kế chi tiết: Đầu ngày 1</mention> (lịch sử, flow chi tiết đã bị thay bằng flow đơn giản).
- Trang devlife thứ hai `3f4cc149636981148e4bf1577b9c4e70` đã mở: chỉ template trống, không dùng làm nguồn/trang cha.

## 11. Trio v3 image-only — ảnh minh họa đã bàn giao, PM duyệt cho síp review

**Không cần Blender, .blend, GLB hay editable 3D scene.** Yêu cầu v2 3D/source scene đã bị thay thế bởi chỉ đạo image-only của síp. PM đã xem contact_sheet.png và chấp nhận hướng **2D illustration viền đen ấm, dễ thương/hài nhẹ** để gửi síp review; không coi đây là síp đã duyệt gameplay hoặc là integration test. Preview sheet đã bàn giao và kiểm tra file, không ghi nhận PM xem riêng sheet này ở v3 nếu chưa có xác nhận.

Thư mục gốc trên box: `/workspace/devlife-art/ai_agents_trio_v3/`.

| Stable ID / tên | Ảnh minh họa / bảng màu | PNG alpha (relative to root) | Ảnh generate gốc giữ nguyên (relative to root) |
| --- | --- | --- | --- |
| claude_inspired / Mọt Mơ | Sách/kính to, nét mực ấm, cam đất/kem | claude_inspired/claude_inspired_512.png; claude_inspired/claude_inspired_256.png; claude_inspired/claude_inspired_64.png | claude_inspired/claude_inspired_generated_original.jpg |
| cursor_inspired / Vút Vít | Con trỏ tinh nghịch, đen trắng/má cam | cursor_inspired/cursor_inspired_512.png; cursor_inspired/cursor_inspired_256.png; cursor_inspired/cursor_inspired_64.png | cursor_inspired/cursor_inspired_generated_original.jpg |
| copilot_inspired / Kính Bay | Mây/kính phi công nháy mắt, xanh lá/mint | copilot_inspired/copilot_inspired_512.png; copilot_inspired/copilot_inspired_256.png; copilot_inspired/copilot_inspired_64.png | copilot_inspired/copilot_inspired_generated_original.jpg |

Ảnh gốc thực tế là **JPEG RGB 1024×1024**, không đổi đuôi giả PNG. Mỗi ID còn có cutout_master.png, master_1024.png và alpha_mask.png để chỉnh ảnh; không cần tạo source Blender bổ sung. Generated original theo Art dùng nền chroma magenta, alpha được xử lý sau; không nói generator đã xuất ảnh gốc trong suốt.

| File bàn giao / QA | Local path / kết quả |
| --- | --- |
| Contact sheet PM đã xem | /workspace/devlife-art/ai_agents_trio_v3/contact_sheet.png — 1440×600 RGB |
| Preview sheet | /workspace/devlife-art/ai_agents_trio_v3/preview_sheet.png — 1320×1100 RGB |
| Handoff, palettes, reference URLs, exact prompts | /workspace/devlife-art/ai_agents_trio_v3/HANDOFF.md |
| ZIP Art gốc | /workspace/devlife-art/ai_agents_trio_v3/ai_agents_trio_v3.zip — 48 file, CRC/path safety/completeness PASS, entry khớp SHA-256/bytes local |
| Report kiểm tra mới | /workspace/devlife-ai-agent-design/TRIO_2D_ASSET_VALIDATION.json |
| Balance giữ nguyên | /workspace/devlife-ai-agent-design/BALANCE_TRIO.md |
| Gói review hiện hành | /workspace/devlife-ai-agent-design/devlife-ai-agent-trio-2d-review.zip — design/balance/brief + original JPEG/processed PNG/mask/handoff/preview + README chưa triển khai |

Tool validation: đủ 9 PNG runtime đúng 512/256/64, RGBA alpha 0–255 và mọi outer border trong suốt; không phát hiện pixel magenta-dominant với alpha >16 theo rule kiểm tra. Tổng 46 image PNG/JPEG decode tốt. ZIP đủ mọi file trong thư mục (trừ chính ZIP), CRC và toàn bộ bytes/hash khớp. Không có .blend/.glb/.gltf trong bộ v3, đúng phạm vi không yêu cầu 3D. Kiểm tra pixel là rule kỹ thuật, không thay PM visual review/không bảo đảm mọi halo thẩm mỹ bằng thuật toán.

**Preview/mock-up only, chưa triển khai:** sheet và mẫu kích thước là ảnh tĩnh, không screenshot tính năng game. Không bake price/stats/text/logo vào runtime portrait. Code/fix/minigame/picker chưa được triển khai hoặc kiểm thử; PM duyệt art không đồng nghĩa duyệt giá/m/q/gate. Cả ba giữ balance mục 4 nguyên vẹn.

Theo HANDOFF của Art: GenerateImage tạo ba ảnh mới, v2 chỉ dùng tham chiếu nhân vật/palette, không render Blender để làm v3. HANDOFF ghi palettes/reference URLs/exact prompts; màu là target anchors, không hứa mọi pixel shading đúng hex. Kính Bay vẫn dùng GitHub parent-brand green, không claim palette riêng Copilot. Đây là mascot cảm hứng nguyên bản, không official partnership/endorsement, không tự xác nhận pháp lý. PM cung cấp PNG/ZIP trong chat; local path không phải attachment/link tải Notion, không upload external trong bước này.

### Brief image-only đã thực hiện / tái sử dụng

Đúng 3 portrait ID ổn định; 2D outlined illustration mềm, biểu cảm rõ ở 24/48/64px, nền alpha sạch; kiểm trên nền sáng/tối. Không yêu cầu match vật liệu/render 3D của shop — thumbnail AI có thể là illustration trong khung UI shop hiện tại. Facts shop cũ dùng ảnh 3D ở mục 2 chỉ là hiện trạng, không ràng buộc art AI mới phải 3D. Tái dùng status/progress/check/clock/coin/energy/audio có sẵn; CRT vẫn ASCII xanh/amber. Không cần animation/state sheet mới, mô hình phòng hay CustomizePanel thay đổi.

### Lịch sử — giữ nguyên file và ZIP cũ

Bạn Code v1, trio v2 3D tại `/workspace/devlife-art/ai_agents_trio_v2/`, cùng `devlife-ai-agent-design-review.zip` và `devlife-ai-agent-trio-review.zip` trong thư mục design đều giữ nguyên, **superseded cho art hiện hành**. Không xóa/ghi đè, không đóng gói 3D v2 vào review 2D mới. Report/source validation v2 chỉ là lịch sử. HANDOFF/ZIP gốc v3 có thể ghi PM pending do xuất trước review; trạng thái mới nhất là PM chấp nhận contact sheet cho síp review, như mục này.

## 12. Trạng thái bộ review image-only v3

- [x] Giữ đúng 3 agent/tên/ID và toàn bộ balance/gameplay proposal, không sửa giá/m/q.
- [x] Đã nhận ảnh generate gốc + 9 PNG alpha, masters/masks, handoff/prompts và previews; kiểm tra kỹ thuật PASS.
- [x] PM xem contact sheet, chấp nhận hướng illustration 2D cho síp review; ảnh tĩnh, chưa tích hợp game.
- [x] Gói 2D review mới riêng tên, giữ nguyên các ZIP/file cũ; không cần Blender/3D source.
- [ ] Chờ síp review thiết kế/balance/gate và bộ ảnh; chưa triển khai/test gameplay.

Giá/m/q/gate tiếp tục là đề xuất, không benchmark vendor. Không code/commit/merge/publish, không liên hệ bot/upload external. Bộ review thiết kế + ảnh đã sẵn cho PM giao; không tuyên bố feature đã chạy.
