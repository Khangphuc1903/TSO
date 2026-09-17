using System.Net;
using System.Net.Mail;

namespace TutorPlatform.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;
        public EmailService(IConfiguration config) => _config = config;

        public async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var smtp = _config.GetSection("Smtp");
            var username = smtp["Username"] ?? "";
            var password = smtp["Password"] ?? "";

            if (string.IsNullOrWhiteSpace(username) || username.Contains("DÁN_"))
            {
                Console.WriteLine($"[EMAIL SKIPPED] To={toEmail} Subject={subject}\n{htmlBody}");
                return;
            }

            try
            {
                using var client = new SmtpClient(smtp["Host"], int.Parse(smtp["Port"]!))
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                var mail = new MailMessage
                {
                    From = new MailAddress(smtp["FromEmail"]!, smtp["FromName"]),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                mail.To.Add(toEmail);

                await client.SendMailAsync(mail);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[EMAIL FAILED] {ex.Message}\nTo={toEmail} Subject={subject}\n{htmlBody}");
            }
        }

        public static string GenerateOtpCode() =>
            new Random().Next(100000, 999999).ToString();
    }
}