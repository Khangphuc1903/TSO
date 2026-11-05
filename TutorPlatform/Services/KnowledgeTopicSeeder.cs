using Microsoft.EntityFrameworkCore;
using TutorPlatform.Datas;
using TutorPlatform.Model;

namespace TutorPlatform.Services;

public static class KnowledgeTopicSeeder
{
    public static async Task SeedTopicsAsync(TutorPlatformDbContext db, CancellationToken ct = default)
    {
        if (await db.KnowledgeTopics.AnyAsync(ct))
            return;

        var subjects = await db.Subjects.AsNoTracking().ToListAsync(ct);
        if (!subjects.Any()) return;

        int? GetSubId(string name) =>
            subjects.FirstOrDefault(s => string.Equals(s.SubjectName, name, StringComparison.OrdinalIgnoreCase))?.SubjectId;

        var toanId = GetSubId("Toán") ?? GetSubId("Toan") ?? 1;
        var lyId = GetSubId("Vật Lý") ?? GetSubId("Vat Ly") ?? 4;
        var hoaId = GetSubId("Hóa Học") ?? GetSubId("Hoa Hoc") ?? 5;
        var anhId = GetSubId("Tiếng Anh") ?? GetSubId("Tieng Anh") ?? 3;
        var vanId = GetSubId("Ngữ Văn") ?? GetSubId("Van") ?? 2;

        var topics = new List<KnowledgeTopic>
        {
            // === TOÁN HỌC ===
            new() { SubjectId = toanId, GradeLevel = "Lớp 12", TopicName = "Khảo sát hàm số & Cực trị", TopicCode = "TOAN_12_HAM_SO", Description = "Tính đơn điệu, cực trị, tiệm cận, đồ thị và bài toán thực tế" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 12", TopicName = "Nguyên hàm & Tích phân", TopicCode = "TOAN_12_TICH_PHAN", Description = "Phương pháp đổi biến, tích phân từng phần và ứng dụng diện tích/thể tích" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 12", TopicName = "Hình học không gian Oxyz", TopicCode = "TOAN_12_OXYZ", Description = "Tọa độ không gian, phương trình mặt phẳng, đường thẳng và mặt cầu" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 12", TopicName = "Mũ và Logarit", TopicCode = "TOAN_12_LOGARIT", Description = "Lũy thừa, phương trình và bất phương trình mũ - logarit" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 12", TopicName = "Xác suất & Biến cố", TopicCode = "TOAN_12_XAC_SUAT", Description = "Xác suất có điều kiện, công thức nhân và định lý Bayes" },

            new() { SubjectId = toanId, GradeLevel = "Lớp 11", TopicName = "Hình học không gian - Khoảng cách", TopicCode = "TOAN_11_HHKG_KHOANG_CACH", Description = "Khoảng cách từ điểm đến mặt phẳng, khoảng cách giữa hai đường chéo nhau" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 11", TopicName = "Hình học không gian - Góc", TopicCode = "TOAN_11_HHKG_GOC", Description = "Góc giữa đường thẳng và mặt phẳng, góc giữa hai mặt phẳng (nhị diện)" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 11", TopicName = "Lượng giác & Phương trình lượng giác", TopicCode = "TOAN_11_LUONG_GIAC", Description = "Công thức biến đổi lượng giác, phương trình bậc nhất/bậc hai lượng giác" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 11", TopicName = "Dãy số, Cấp số cộng & Cấp số nhân", TopicCode = "TOAN_11_CAP_SO", Description = "Công thức số hạng tổng quát, tổng n số hạng đầu" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 11", TopicName = "Đạo hàm & Tiếp tuyến", TopicCode = "TOAN_11_DAO_HAM", Description = "Ý nghĩa hình học, phương trình tiếp tuyến của đồ thị hàm số" },

            new() { SubjectId = toanId, GradeLevel = "Lớp 10", TopicName = "Bất phương trình & Hệ bất phương trình bậc hai", TopicCode = "TOAN_10_BAT_PT", Description = "Dấu của tam thức bậc hai, giải bất phương trình chứa ẩn dưới dấu căn" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 10", TopicName = "Vectơ & Hệ thức lượng trong tam giác", TopicCode = "TOAN_10_VECTO", Description = "Định lý Sin, Cosin, công thức tính diện tích tam giác và tích vô hướng" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 10", TopicName = "Phương pháp tọa độ Oxy", TopicCode = "TOAN_10_OXY", Description = "Phương trình đường thẳng, đường tròn và ba đường conic" },

            new() { SubjectId = toanId, GradeLevel = "Lớp 9", TopicName = "Hệ phương trình bậc nhất hai ẩn", TopicCode = "TOAN_9_HE_PT", Description = "Phương pháp thế, cộng đại số và giải bài toán bằng cách lập hệ phương trình" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 9", TopicName = "Phương trình bậc hai & Hệ thức Vi-ét", TopicCode = "TOAN_9_VIET", Description = "Công thức nghiệm, định lý Vi-ét và các bài toán tìm m" },
            new() { SubjectId = toanId, GradeLevel = "Lớp 9", TopicName = "Đường tròn & Góc với đường tròn", TopicCode = "TOAN_9_DUONG_TRON", Description = "Góc nội tiếp, góc tạo bởi tia tiếp tuyến và dây cung, tứ giác nội tiếp" },

            // === VẬT LÝ ===
            new() { SubjectId = lyId, GradeLevel = "Lớp 12", TopicName = "Dao động cơ học (Con lắc lò xo / đơn)", TopicCode = "LY_12_DAO_DONG_CO", Description = "Phương trình dao động điều hòa, năng lượng và đồ thị dao động" },
            new() { SubjectId = lyId, GradeLevel = "Lớp 12", TopicName = "Sóng cơ & Giao thoa sóng", TopicCode = "LY_12_SONG_CO", Description = "Độ lệch pha, điều kiện cực đại cực tiểu giao thoa sóng cơ" },
            new() { SubjectId = lyId, GradeLevel = "Lớp 12", TopicName = "Dòng điện xoay chiều (Mạch RLC)", TopicCode = "LY_12_DIEN_XOAY_CHIEU", Description = "Tổng trở, cộng hưởng điện, giản đồ vectơ và công suất mạch" },
            new() { SubjectId = lyId, GradeLevel = "Lớp 12", TopicName = "Sóng ánh sáng & Giao thoa Young", TopicCode = "LY_12_GIAO_THOA_AS", Description = "Tán sắc ánh sáng, vị trí vân sáng/vân tối, khoảng vân" },
            new() { SubjectId = lyId, GradeLevel = "Lớp 12", TopicName = "Lượng tử ánh sáng & Hạt nhân", TopicCode = "LY_12_LUONG_TU", Description = "Hiện tượng quang điện, thuyết photon, phản ứng phân hạch nhiệt hạch" },

            new() { SubjectId = lyId, GradeLevel = "Lớp 11", TopicName = "Điện trường & Định luật Coulomb", TopicCode = "LY_11_DIEN_TRUONG", Description = "Cường độ điện trường, điện thế, hiệu điện thế và tụ điện" },
            new() { SubjectId = lyId, GradeLevel = "Lớp 11", TopicName = "Từ trường & Cảm ứng điện từ", TopicCode = "LY_11_TU_TRUONG", Description = "Lực từ, từ thông, định luật Faraday và Lenz" },

            // === HÓA HỌC ===
            new() { SubjectId = hoaId, GradeLevel = "Lớp 12", TopicName = "Este - Lipit", TopicCode = "HOA_12_ESTE_LIPIT", Description = "Đồng phân, phản ứng xà phòng hóa este và bài toán đốt cháy" },
            new() { SubjectId = hoaId, GradeLevel = "Lớp 12", TopicName = "Amin - Amino Axit - Peptit", TopicCode = "HOA_12_AMINO_AXIT", Description = "Tính bazơ amin, phản ứng thủy phân peptit và bài toán bảo toàn khối lượng" },
            new() { SubjectId = hoaId, GradeLevel = "Lớp 12", TopicName = "Đại cương Kim loại & Ăn mòn điện hóa", TopicCode = "HOA_12_KIM_LOAI", Description = "Dãy điện hóa, ăn mòn kim loại và điều chế kim loại" },
            new() { SubjectId = hoaId, GradeLevel = "Lớp 11", TopicName = "Sự điện li & Độ pH", TopicCode = "HOA_11_DIEN_LI", Description = "Axit, bazơ, muối, hằng số phân li và tính toán pH dung dịch" },
            new() { SubjectId = hoaId, GradeLevel = "Lớp 11", TopicName = "Hợp chất Hữu cơ & Hiđrocacbon", TopicCode = "HOA_11_HUU_CO", Description = "Ankan, anken, ankin, benzen và cơ chế phản ứng thế/cộng" },

            // === TIẾNG ANH ===
            new() { SubjectId = anhId, GradeLevel = "Lớp 12", TopicName = "Mệnh đề quan hệ (Relative Clauses)", TopicCode = "ENG_REL_CLAUSES", Description = "Mệnh đề xác định/không xác định, lược bỏ đại từ quan hệ" },
            new() { SubjectId = anhId, GradeLevel = "Lớp 12", TopicName = "Câu điều kiện & Đảo ngữ (Conditionals & Inversion)", TopicCode = "ENG_CONDITIONALS", Description = "Câu điều kiện loại 1, 2, 3, hỗn hợp và cấu trúc đảo ngữ nâng cao" },
            new() { SubjectId = anhId, GradeLevel = "Lớp 12", TopicName = "Collocations & Idioms trong đề thi ĐH", TopicCode = "ENG_COLLOCATIONS", Description = "Cụm từ cố định, thành ngữ và từ đồng nghĩa/trái nghĩa" },
            new() { SubjectId = anhId, GradeLevel = "Lớp 11", TopicName = "12 Thì cơ bản & Nâng cao (Verb Tenses)", TopicCode = "ENG_TENSES", Description = "Sự phối hợp thì trong câu phức, thì quá khứ hoàn thành" },
            new() { SubjectId = anhId, GradeLevel = "Lớp 11", TopicName = "Câu bị động & Thể sai khiến (Passive Voice)", TopicCode = "ENG_PASSIVE", Description = "Bị động đặc biệt, bị động với động từ chỉ ý kiến" },

            // === NGỮ VĂN ===
            new() { SubjectId = vanId, GradeLevel = "Lớp 12", TopicName = "Nghị luận Văn học (Tác phẩm trọng tâm)", TopicCode = "VAN_12_NL_VAN_HOC", Description = "Kỹ năng phân tích nhân vật, đoạn thơ, giá trị nhân đạo và hiện thực" },
            new() { SubjectId = vanId, GradeLevel = "Lớp 12", TopicName = "Nghị luận Xã hội (Đoạn văn 200 chữ)", TopicCode = "VAN_12_NL_XA_HOI", Description = "Kỹ năng lập dàn ý, dẫn chứng thực tế và phản đề tư tưởng đạo lý" },
            new() { SubjectId = vanId, GradeLevel = "Lớp 11", TopicName = "Đọc hiểu Văn bản & Tiếng Việt", TopicCode = "VAN_11_DOC_HIEU", Description = "Phong cách ngôn ngữ, phương thức biểu đạt, biện pháp tu từ" }
        };

        db.KnowledgeTopics.AddRange(topics);
        await db.SaveChangesAsync(ct);
    }
}
