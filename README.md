# Học toán cùng Numberblocks

Trang web tĩnh, an toàn cho bé xem video **Numberblocks** (kênh chính thức
@Numberblocks của BBC CBeebies, Blue Zoo / Alphablocks Ltd) để học toán.

- **Bé nhỏ (3 tuổi+):** Level 1 (số đến 5) và Level 2 (số đến 10) — 121 video.
- **Bé lớn (7 tuổi+):** Level 3 (số đến 20), Level 4 (số đến 50), Level 5 (số đến 100),
  có mục riêng **Học nhân** (21 video) và **Học chia** (8 video) — 257 video.

Tổng cộng **378 video đã kiểm tra** (xem thống kê bên dưới).

## Cách chạy thử (preview)

Cần chạy qua http, đừng mở trực tiếp file `index.html` vì YouTube không cho
phát video nhúng từ trang `file://`:

```bash
cd numberblocks-site
python3 -m http.server 8000
# Mở http://localhost:8000 trên trình duyệt / tablet
```

Khi có repo GitHub: đẩy toàn bộ thư mục này lên repo, bật
Settings → Pages → Branch: main (hoặc master) → Save.
**Không** đặt custom domain nếu chưa có bản ghi DNS trỏ về GitHub Pages.

## An toàn cho bé (luật cứng, kế thừa site Truyện Kể Cho Bé)

- Player full-page thật; mọi nút điều khiển nằm **bên trong** khung video.
- Một lớp phủ trong suốt (click-shield) nằm trên video: cái chạm của bé
  **không bao giờ** chạm được vào giao diện YouTube.
- Thông số YouTube: `controls=0, autoplay=1, fs=0, rel=0, modestbranding=1`,
  phụ đề tắt mặc định (`cc_load_policy=0`) và tắt lại module captions
  mỗi lần một video bắt đầu phát.
- Controller tự ẩn sau 3 giây khi đang phát; chạm đầu tiên khi controller
  đang ẩn chỉ làm hiện controller, không play/pause. Khi pause, controller
  luôn hiện.
- Tự phát video tiếp theo trong danh sách đang lọc; nút lặp lại 1 video;
  nút qua bài / lại bài; thanh tiến trình bấm để tua.
- Video lỗi (bị xoá / không phát được) tự bỏ qua sang video kế tiếp.
- Nút chạm tối thiểu 72px ở các nút chính, chữ to, ít chữ.

## Khu cha mẹ

- Bấm **Cho cha mẹ** và nhập PIN. **PIN mặc định: 1234.**
  Đổi PIN được trong khu cha mẹ; PIN lưu ở `localStorage` của máy đang dùng
  (không gửi đi đâu, đổi máy là về mặc định).
- Hẹn giờ xem: tắt / 15 / 30 / 45 / 60 phút. Hết giờ video tự dừng và hiện
  màn hình nghỉ mắt; cha mẹ nhập PIN để mở thêm.
- Lịch sử xem gần đây (40 mục gần nhất) lưu ở `localStorage`, xoá được.

## Dữ liệu video: nguồn và cách kiểm tra

Toàn bộ video lấy bằng `yt-dlp` (bản 2026.10.26) ngày 2026-10-27, **chỉ** từ
kênh chính thức **Numberblocks**, `channel_id = UCPlwvN0w4qFSP1FllALB92w`,
và mỗi playlist đều được kiểm tra lại `channel_id` này trước khi lấy:

| Nguồn | Playlist ID | Số video thô |
|---|---|---|
| Level 1 (Red) | `PL9swKX1PviEpnxJWB289pXKORExasf41V` | 31 |
| Level 2 (Orange) | `PL9swKX1PviEp_2zvFhOckDiICOBygnM9O` | 10 |
| Level 3 (Yellow) | `PL9swKX1PviEpa5BugsNZD1omRsTT7rTbm` | 39 |
| Level 4 | `PL9swKX1PviEroM-l-tisdiTJZv8AABcvu` | 9 |
| Level 5 | `PL9swKX1PviEojLs06Ry5ks-ur2uendQrx` | 5 |
| COURSE Level 1–5 (từng tập lẻ) | `PL9swKX1PviEqgqPBggcaswkooG0VeclZv`, `PL9swKX1PviErNxVO7hwpbTQpc6JEOipRN`, `PL9swKX1PviEreEPMSNS5uA52jwQSpaSnc`, `PL9swKX1PviEpyzkIRlxwSsiYa1VPHyS9K`, `PL9swKX1PviEoJOFa1aP_OSHCz9XkSPZ3Q` | 107 |
| Numberblocks COMPILATIONS! | `PL9swKX1PviEqjP8g3GOY6xRNyyMmABJYs` | 126 |
| Season Two Clips (Orange level) | `PL9swKX1PviEo1XKeA_toOOaFXBrP5I-Im` | 16 |
| Learn Multiplication | `PL9swKX1PviEodW10jz6UkxZw1Un5L1u26` | 15 |
| Learn Addition for Kids | `PL9swKX1PviEqJ_2xkoEK8_VJ4mMy4mS9Q` | 7 |
| Season 8 FULL EPISODES (xếp Level 4) | `PL9swKX1PviErV5UKYedc69ITUoipMhr9M` | 30 |
| Exclusive Music Videos (xếp Level 2) | `PL9swKX1PviEpYNhyUISiOwGHs55TNUytH` | 5 |
| Fun Interactive Maths (xếp Level 3) | `PL9swKX1PviEqV1hpGEvmIeejHOKcMNFjJ` | 5 |

Cộng thêm tìm kiếm trên YouTube (`ytsearch`) cho các chủ đề kênh không có
playlist riêng — học chia, gấp đôi / một nửa, số chẵn lẻ, quy luật, phép trừ —
và **chỉ giữ** kết quả có `channel_id` đúng kênh chính thức (loại bỏ nhiều
kênh đăng lại như Loop de Boop, ColorArt_id...).

Sau khi gộp, khử trùng lặp theo mã video và loại các mục yt-dlp không trả
tiêu đề (34 mục trong COURSE Level 2, nhiều khả năng là video đã ẩn/xoá):
**378 video duy nhất**, mọi mã đều là mã YouTube thật 11 ký tự do yt-dlp trả về.
Không có mã nào bị bịa.

Thống kê 341 video:

- Theo level: L1: 51 · L2: 70 · L3: 190 · L4: 49 · L5: 18
- Theo chủ đề: đếm số 93 · tổng hợp 193 · cộng/trừ 21 · nhân 21 · chia 8 ·
  gấp đôi/một nửa 9 · chẵn/lẻ 16 · quy luật 17
- Theo hồ sơ: bé nhỏ 121 · bé lớn 257

Giới hạn phân loại cần biết: chủ đề và level của từng video được suy ra từ
tiêu đề + playlist nguồn (không xem nội dung từng video). Các compilation
không ghi level trong tiêu đề được xếp tạm vào Level 3 / bé lớn. Kênh
Numberblocks **không có playlist "Learn Division" riêng**, nên mục Học chia
ghép từ playlist Level 3 và tìm kiếm đã lọc kênh (8 video). File `data.json`
giữ trường `sources` cho từng video để cha mẹ kiểm tra lại nguồn bất cứ lúc nào.

## Thiết kế: Hallmark (Nutlope/hallmark)

- Skill: https://github.com/Nutlope/hallmark, SKILL.md v2.0.0, cài thử bằng
  `npx skills add nutlope/hallmark` và chạy `sloplint` trực tiếp từ bản clone.
- Genre: **playful**. Đã đọc và so 4 theme playful/kề playful: **Hum** (chọn),
  Bloom, Carnival, Arcade. Hum thắng vì nó được viết cho kids/family/learning,
  bo góc 28–32px cho trẻ em, nút card-stock ấn xuống, giấy kem, và bản mẫu
  của nó là một game đọc cho trẻ em. Carnival là genre editorial với góc
  vuông 2px và chữ hoa poster khó đọc cho bé mới tập đọc; Arcade tuy genre
  playful nhưng là máy game CRT tối màu aubergine, chữ pixel và hoài cổ
  người lớn; Bloom là genre atmospheric, trầm, terracotta và người lớn hơn.
- Palette/type lấy từ `references/themes/hum.md` của Hallmark: giấy kem
  `oklch(97% 0.012 95)`, mực blue-black, accent pear, blue, coral, mint;
  radius và shadow card-stock giữ nguyên tinh thần theme.
- Hai waiver ghi ngay trong stamp ở đầu `styles.css`:
  1. Font: Chillax (font của Hum) không có dấu tiếng Việt, nên Baloo 2 /
     Nunito (bo tròn, đủ dấu tiếng Việt) dẫn đầu stack, Chillax vẫn giữ
     trong stack cho chữ Latin/số.
  2. Kích thước chạm: nút chính 72px thay vì 54px của Hum, theo luật an toàn
     cho bé của gia đình.
- Kết quả sloplint (chạy thật, không bịa):
  - Tĩnh: **0 FAIL, 0 REFLEX, 4 WARN** (WARN đã trả lời trong stamp:
    nhãn cửa dài vì cửa là thẻ bấm lớn; nhiều biến thể nút đều là cùng một
    hệ card-stock; radius pill giữ cho nút chạm của trẻ).
  - Render (Chrome thật, 5 cỡ màn hình): **0 FAIL, 2 REFLEX, 6 WARN**.
    2 REFLEX là luật dành cho landing page (chiều cao nút 44–52px, khoảng
    trống dưới hero) — đã waiver trên stamp vì đây là app cho trẻ em;
    khoảng trống đã được giảm bằng cách căn giữa nội dung theo chiều dọc.
  - Trong môi trường kiểm tra tự động, Chrome bị chặn mạng nội bộ và font
    web không tải được trong ảnh chụp (hiển thị font dự phòng); trên trình
    duyệt thật font Baloo 2 / Nunito tải từ Google Fonts.

## Cấu trúc file

- `index.html` — 3 màn hình: chọn bé (signature: 2 cửa lớn), danh sách, player + PIN + khu cha mẹ
- `styles.css` — toàn bộ màu/font khai báo ở token `:root` (Hallmark Floor), có Hallmark stamp ở dòng đầu
- `app.js` — logic lọc, player YouTube IFrame API, click-shield, hẹn giờ, PIN, lịch sử
- `data.js` — `window.NUMBERBLOCKS_VIDEOS` (378 video, nạp bởi index.html)
- `data.json` — bản nguồn đầy đủ kèm `sources` từng video

## Trạng thái

Prototype chạy thử được bằng http server ở trên; đã kiểm tra cú pháp JS
(`node --check`), kiểm tra mọi `id` trong app.js đều có trong HTML, và chạy
thử bằng Chrome thật: chọn hồ sơ hiện đúng số thẻ video theo hồ sơ (121 cho bé nhỏ sau lần gộp cuối), player
mở đúng video và click-shield hoạt động. Việc phát video thật cần origin
http/https (GitHub Pages) như các site trước của gia đình.

Chưa push GitHub: chờ repo của gia đình (theo bộ nhớ mới cập nhật, repo là
`github.com/vinhdn/numberblocks` — khi push cần dùng token mới và thu hồi
token đã dán vào chat sau khi push xong).
