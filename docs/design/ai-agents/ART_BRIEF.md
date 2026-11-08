# Art brief hiện hành — trio v3 image-only, PM contact-sheet approved for user review

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


## Balance không đổi

### 4.1. Bảng đề xuất để Art/PM cùng ghép ID

**Không phải số liệu sản phẩm thật; tên Art dùng cho design, stable ID giữ nguyên.** `m` là hệ số thời gian code và AI fix (thấp hơn nhanh hơn); `q` là xác suất từng bug tiềm năng còn lại sau agent code, KHÔNG phải mỗi lần sửa hay fail task.

| ID / cảm hứng | Tên Art / màu asset đã bàn giao | Giá tiền game | m code & fix | q mỗi bug tiềm năng | Lợi / hại |
| --- | --- | --- | --- | --- | --- |
| claude_inspired / Claude | Mọt Mơ — cam đất/kem | 900.000đ | 0,90 (tốc độ ≈1,11× nền) | 25% | Ít bug nhất, bớt gánh khi tự fix; code/fix chậm hơn Vút Vít, vốn cao hơn Kính Bay. “Đọc kỹ rồi mới dám Enter”. |
| cursor_inspired / Cursor | Vút Vít — than đen/trắng, mắt sáng | 1.200.000đ | 0,55 (≈1,82×) | 80% | Nhanh nhất cả code/fix, đắt nhất và nhiều bug hơn nếu chọn tự sửa. “Chạy nhanh, bug chạy theo”. |
| copilot_inspired / GitHub Copilot | Kính Bay — mây trắng, kính xanh lá/mint | 180.000đ | 1,10 (≈0,91×) | 60% | Mua sớm, ít bug hơn Vút Vít nhưng chậm nhất; vẫn có đủ code/fix. “Ví mỏng có bạn đồng hành”. |

Không agent nào bị khóa fix/code; không strict tier bắt mua tuần tự. Vút Vít thắng tốc độ nhưng thua chi phí/bug; Mọt Mơ thắng chất lượng, Kính Bay thắng giá. Manual giá 0, không tiêu license, giữ lựa chọn nhanh/ẩu và minigame chủ động; không giảm XP/năng lượng riêng để ép mua.

