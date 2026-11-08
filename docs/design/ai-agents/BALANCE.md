# Balance đề xuất — Mọt Mơ / Vút Vít / Kính Bay

Chưa triển khai/chưa cân bằng; PM duyệt asset không phải duyệt các con số.

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

