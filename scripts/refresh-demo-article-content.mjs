import fs from "node:fs";

const files = ["server/data/published-articles.json", "server/data/articles.json"];
const now = "2026-08-11T00:00:00.000Z";

const source = (title, excerpt) => [{
  id: `ref-${slug(title).slice(0, 18)}`,
  title,
  kind: "note",
  source: "reviewer",
  excerpt,
  addedAt: now,
  addedBy: "Content Governance",
}];

const publicSource = (title, url, excerpt) => [{
  id: `ref-${slug(title).slice(0, 18)}`,
  title,
  kind: "url",
  source: url,
  excerpt,
  addedAt: now,
  addedBy: "Content Governance",
}];

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function nextReview(months = 6) {
  const d = new Date(now);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

const articles = {
  driverToken: {
    title: "How to refresh a driver login token",
    lead: "Use this article when a route or delivery app says your driver login token has expired, your session cannot be verified, or you are asked to sign in again before starting route work.",
    body: `# How to refresh a driver login token

If your route app says your login token has expired, refresh the token before you begin your next delivery or pickup activity. A token refresh confirms your identity, reconnects the app to PepsiCo systems, and prevents route updates from being saved under an old session.

## Summary

Driver login tokens normally refresh in the background. You only need to refresh manually when the app shows a token, session, or authentication message. Most refreshes take less than two minutes if your device has a working data connection.

Do not share your token, password, one-time code, or device PIN with anyone. Support teams will never ask for your password.

## Who this applies to

This article applies to U.S. and Canada drivers, merchandisers, and field employees who use a PepsiCo-issued mobile device or approved route application to complete daily work.

It does not apply to plant kiosk access, payroll login, or contractor systems that use a separate identity provider.

## Before you start

- Confirm your device has cellular service or Wi-Fi.
- Make sure the device date and time are set automatically.
- Close any duplicate route app windows.
- Have your employee ID available in case the support desk needs to confirm your account.
- If you are already on a route, pull over safely before troubleshooting.

## Steps

1. Open the route app and wait 15 seconds for the session message to finish loading.
2. Tap **Refresh session** or **Sign in again**.
3. Enter your PepsiCo username and password if prompted.
4. Complete multi-factor authentication on your registered device.
5. Return to the route app and confirm your route list, stop list, or delivery task reloads.
6. Tap **Sync** before continuing work so any offline activity is reconciled.

If the app opens but your route list is blank, do not create a new route manually. Use **Sync now** once, then contact support if the list is still blank.

## Common situations

### The refresh button does not appear

Force close the route app, reopen it, and wait for the sign-in screen. If the app opens directly to your route but still shows stale data, use the app menu to sign out and sign back in.

### Multi-factor authentication is going to the wrong phone

Use the identity verification page in MyPepsiCo to update your authentication method. If you cannot access that page, call the IT Service Desk from a phone you can receive calls on.

### The app says the device is not compliant

Connect to the internet and let device management check for required updates. Restart the device after updates install. If the message remains, open a MyIT ticket with the exact compliance message and your device asset tag.

### You are blocked at a customer location

Call dispatch or your supervisor first so the route impact is visible. Then contact IT support and include the route number, device number, and the error message.

## Need help?

Open a MyIT ticket under **Mobile device and route app access** or call the IT Service Desk if you are blocked from completing route work. Include the error text, device number, route number, location, and what you already tried.`,
    seo: {
      title: "Refresh a driver login token",
      metaDescription: "Steps for drivers to refresh an expired route-app login token, complete authentication, sync route data, and know when to contact support.",
      keywords: ["driver", "route app", "login token", "mobile device", "authentication"],
      summary: "Use this article when a driver route app says the login token or session has expired. It explains how to refresh the session, sync route data, and escalate blocked route work.",
      keyQuestions: ["How do I refresh my driver login token?", "What should I do if the route app says my session expired?", "Who do I contact when token refresh fails?"],
      entities: ["MyPepsiCo", "MyIT", "route app", "IT Service Desk"],
    },
    topics: ["Driver technology", "Route app access", "Authentication"],
    aliases: ["expired driver token", "route app session expired", "driver app sign in again"],
    owner: "Field Technology Support",
    references: source("Field mobile access support playbook", "Support guidance for route-app session refresh, mobile device compliance, and route-impact escalation."),
  },
  speakUp: {
    title: "How to use Speak Up to report an ethics concern",
    lead: "Use this article when you need to report a possible violation of the Code of Conduct, ask for ethics guidance, or understand what happens after a Speak Up report is submitted.",
    body: `# How to use Speak Up to report an ethics concern

Speak Up is PepsiCo's reporting channel for raising concerns about conduct that may violate the Global Code of Conduct, company policy, or the law. You can also use this article to decide whether Speak Up is the right path or whether your manager, HR, Legal, or Global Compliance and Ethics is the better first contact.

## Summary

PepsiCo expects employees to act with integrity and to report concerns in good faith. Speak Up is available for concerns such as harassment, discrimination, retaliation, conflicts of interest, falsified records, bribery, safety issues, theft, or pressure to do something that does not feel right.

Reports can be made online or by phone. Where permitted by local law, reports may be anonymous. PepsiCo prohibits retaliation against anyone who raises a concern in good faith or participates in an investigation.

## Who this applies to

This article applies to employees, managers, contractors, and others working on behalf of PepsiCo who need to raise or route an ethics or compliance concern.

If there is an immediate threat to life, safety, or property, contact local emergency services or site security first.

## Before you start

- Write down what happened, when it happened, where it happened, and who was involved.
- Keep copies of relevant documents, messages, screenshots, or transaction details.
- Do not investigate on your own or access information you are not authorized to view.
- Decide whether you are comfortable providing your name or prefer anonymity where allowed.

## Steps

1. Choose the reporting channel that fits the concern: your manager, Human Resources, Legal, Global Compliance and Ethics, or Speak Up.
2. If using Speak Up, open the Speak Up webline or call the dedicated phone line for your country.
3. Describe the concern clearly and stick to facts you know directly.
4. Include dates, locations, names or roles, documents, and any immediate risk.
5. Save the case number or confirmation details so you can provide follow-up information.
6. Continue to cooperate if an investigator contacts you.

## Common situations

### You are not sure whether something is a violation

Report what you know and ask for guidance. You do not need to prove misconduct before raising a concern in good faith.

### You are worried about retaliation

Retaliation for a good-faith report is prohibited. If you believe retaliation has occurred, report that as a separate concern and include the original case number if you have it.

### Your concern is about a pay, benefit, or scheduling issue

Use HR support first unless the issue involves discrimination, harassment, retaliation, falsified records, or another potential Code violation.

### You are a manager receiving a concern

Listen, thank the employee, avoid promising a specific outcome, and route the concern through the appropriate channel. Do not investigate sensitive ethics matters without guidance.

## Need help?

Contact Human Resources, Global Compliance and Ethics, or the Law Department if you need help choosing the right reporting path. Use Speak Up directly if you are uncomfortable raising the concern through local channels.`,
    seo: {
      title: "Use Speak Up to report concerns",
      metaDescription: "How to report a PepsiCo ethics or compliance concern through Speak Up, what information to include, and what protections apply.",
      keywords: ["Speak Up", "ethics", "compliance", "Code of Conduct", "retaliation"],
      summary: "Speak Up is PepsiCo's reporting channel for possible Code, policy, or legal violations. This article explains when to use it, what to include, and how non-retaliation protections apply.",
      keyQuestions: ["How do I submit a Speak Up report?", "Can I report an ethics concern anonymously?", "What happens after I report a concern?"],
      entities: ["Speak Up", "Global Code of Conduct", "Global Compliance and Ethics", "Human Resources", "Law Department"],
    },
    topics: ["Ethics and compliance", "Speak Up", "Reporting concerns"],
    aliases: ["submit a report", "ethics hotline", "report misconduct", "Code of Conduct concern"],
    owner: "Global Compliance and Ethics",
    references: source("PepsiCo Global Code of Conduct and Speak Up public guidance", "Public PepsiCo guidance describes Speak Up, Code of Conduct expectations, confidentiality, anonymity where permitted, and non-retaliation principles."),
  },
  resetPassword: {
    title: "How to reset your MyPepsiCo password",
    lead: "Use this article when you forgot your MyPepsiCo password, your password expired, or you need to unlock access before signing in to employee tools.",
    body: `# How to reset your MyPepsiCo password

Your MyPepsiCo password protects access to employee tools, HR information, learning systems, email, and support channels. Reset your password as soon as you cannot sign in or receive an expired-password message.

## Summary

Most employees can reset their password through the self-service sign-in page. The process requires identity verification and may require multi-factor authentication. If your registered authentication method is unavailable, contact the IT Service Desk.

Never send your password, verification code, or authenticator approval to another person. IT support may verify your identity, but they will not ask you to disclose your password.

## Who this applies to

This article applies to employees and contractors who use a PepsiCo network ID to access MyPepsiCo, MyIT, learning resources, HR tools, email, or other company applications.

It does not apply to applicant accounts, supplier portals, customer portals, or personal social media accounts.

## Before you start

- Use a trusted device and network.
- Have your employee ID or username available.
- Keep your registered phone or authenticator app nearby.
- Close extra sign-in windows so you do not reset the wrong account.

## Steps

1. Go to the MyPepsiCo sign-in page.
2. Select **Forgot password** or **Can’t access your account**.
3. Enter your PepsiCo username or employee email address.
4. Complete the identity verification prompt.
5. Create a new password that meets the current password rules.
6. Wait two minutes, then sign in again.
7. If you use email, Teams, VPN, or mobile apps, sign out and sign back in so the new password syncs.

## Common situations

### You changed your password but still cannot sign in

Wait a few minutes for systems to sync. Then close the browser, open a new private window, and try again. If a mobile app is still failing, remove the old saved password from the device.

### Your account is locked

Wait for the lockout window to expire or use self-service unlock if the option appears. If you are blocked from work, contact the IT Service Desk.

### Multi-factor authentication is unavailable

Use a backup method if one is registered. If you changed phones or lost access to your authenticator app, contact IT support to verify your identity and reset your authentication method.

### You receive repeated password prompts

Update saved passwords in Outlook, Teams, VPN, browser password managers, and mobile mail apps. Repeated prompts usually mean one device is still trying the old password.

## Need help?

Open a MyIT ticket under **Password and sign-in** or call the IT Service Desk if you cannot complete self-service reset. Include the exact error message and whether you still have access to your registered authentication method.`,
    seo: {
      title: "Reset your MyPepsiCo password",
      metaDescription: "Self-service steps to reset an expired or forgotten MyPepsiCo password, unlock access, and resolve common sign-in issues.",
      keywords: ["MyPepsiCo", "password reset", "account locked", "multi-factor authentication"],
      summary: "This article explains how to reset a MyPepsiCo password, complete identity verification, sync the new password across apps, and contact IT when self-service reset fails.",
      keyQuestions: ["How do I reset my MyPepsiCo password?", "What if my PepsiCo account is locked?", "Why do apps still ask for my old password?"],
      entities: ["MyPepsiCo", "MyIT", "IT Service Desk", "multi-factor authentication"],
    },
    topics: ["Password and sign-in", "Employee access", "MyPepsiCo"],
    aliases: ["forgot password", "account locked", "can't access MyPepsiCo"],
    owner: "Identity and Access Management",
    references: source("Identity and access management support guidance", "Standard support guidance for password reset, account unlock, and multi-factor authentication recovery."),
  },
  access: {
    title: "How to request access to a work application",
    lead: "Use this article when you need access to an approved PepsiCo work application, including design, reporting, collaboration, finance, HR, or operations tools.",
    body: `# How to request access to a work application

Application access is managed through standard request and approval workflows so employees receive the right level of access for their role. Use this process instead of asking a teammate to share credentials, export data, or add you informally.

## Summary

Most application access requests start in MyIT or the application’s access request page. Some tools require manager approval, data-owner approval, license availability, or training before access is granted.

Request the minimum access you need to do your work. If you need elevated permissions, explain the business reason and how long you need them.

## Who this applies to

This article applies to employees and contractors who need access to a PepsiCo-approved work tool. It is especially useful for new hires, employees changing roles, project team members, and managers requesting access for direct reports.

## Before you start

- Confirm the application name and business purpose.
- Ask your manager which access level or group is appropriate.
- Collect the cost center, project name, or team name if the request form asks for it.
- Complete any required training listed for the application.
- Do not use another person’s login while waiting for approval.

## Steps

1. Open MyIT and search for the application name.
2. Select the access request item that matches the tool and region.
3. Choose the role, group, or permission level you need.
4. Add a short business justification, including the project or process the access supports.
5. Submit the request.
6. Watch for approval notifications from your manager, data owner, or application owner.
7. After approval, wait for provisioning to complete before trying to sign in.
8. Confirm access works and bookmark the application page.

## Common situations

### You do not know which role to request

Choose the lowest standard role that lets you complete your task, or ask your manager/application owner before submitting. Broad admin access is rarely needed.

### Your request is approved but access does not work

Wait for the provisioning window shown in the request. Then sign out, clear the browser session, and sign in again. If access still fails, reopen the ticket with a screenshot of the error.

### You need access for a short-term project

Include the project end date in the request. Temporary access should be removed when the work ends.

### You are requesting access for a contractor

Confirm the contractor has an active account and sponsor before submitting. Some systems require a different request path for contractors.

## Need help?

Contact the application owner listed in MyIT if you are unsure which role to request. Contact the IT Service Desk if the approved access does not provision correctly.`,
    seo: {
      title: "Request access to a work application",
      metaDescription: "How to request access to an approved PepsiCo work application, choose the right role, get approvals, and troubleshoot provisioning.",
      keywords: ["application access", "MyIT", "permissions", "approval", "provisioning"],
      summary: "This article explains how employees request access to approved work applications through MyIT, including role selection, approvals, provisioning, and troubleshooting.",
      keyQuestions: ["How do I request access to an application?", "What access role should I choose?", "What do I do after access is approved but does not work?"],
      entities: ["MyIT", "application owner", "data owner", "manager approval"],
    },
    topics: ["Application access", "MyIT", "Approvals"],
    aliases: ["request Figma access", "tool access", "app permissions", "software access"],
    owner: "Enterprise Service Management",
    references: source("Application access request standard", "Internal access requests should use approved workflows, role-based permissions, and manager or data-owner approvals where required."),
  },
  brandSafety: {
    title: "Global brand safety review requirements",
    lead: "Use this policy when publishing PepsiCo content, campaign assets, partner materials, or external-facing communications that could affect brand trust or appear next to unsafe content.",
    body: `# Global brand safety review requirements

Brand safety review helps protect PepsiCo brands, employees, consumers, customers, and partners by making sure content appears in appropriate contexts and follows required review paths before publication.

## Summary

Any campaign, article, social post, partner placement, paid media buy, customer-facing presentation, or digital experience that uses PepsiCo brand names, product claims, sustainability statements, employee stories, or third-party placements must follow the applicable brand safety review path.

Brand safety does not replace Legal, Regulatory, Privacy, Sustainability, or Communications review. It helps identify when those reviews are required.

## Who this applies to

This policy applies to marketing, communications, sales, HR, customer teams, agencies, and employees creating or approving PepsiCo-branded content in any market.

Local requirements may be stricter. Follow local review rules when they add requirements beyond this global baseline.

## Policy details

### Content that requires review

Submit content for review before publishing when it includes:

- PepsiCo brand names, logos, product images, or product claims.
- Health, nutrition, ingredient, sustainability, or environmental claims.
- Paid media placements, influencer content, sponsorships, or customer co-branded content.
- Employee photos, personal stories, or identifiable workplace imagery.
- Content intended for external audiences, customers, media, or public social channels.
- Topics involving minors, safety, labor, regulatory matters, or public policy.

### Placement and adjacency standards

Paid and partner content must avoid unsafe adjacency, including hate speech, explicit content, misinformation, illegal activity, exploitation, or content that conflicts with PepsiCo values. Media teams should use approved exclusion categories and monitor placements during the campaign.

### Required approvals

The content owner is responsible for confirming the correct approvals before launch. Depending on the content, approval may include Brand, Legal, Regulatory, Privacy, Communications, Sustainability, HR, or local market leadership.

### Recordkeeping

Keep the final approved asset, approval date, approver names, substantiation for claims, and campaign placement details in the campaign record or approved repository.

## Exceptions

Routine internal status updates, draft planning documents, and one-to-one working files do not require brand safety review unless they include external claims, public release plans, or brand-sensitive imagery.

Urgent business needs can be escalated, but content should not be published without the minimum required approval for the risk category.

## Compliance

Content that does not follow the review process may be removed, corrected, or paused. Repeated misses should be escalated to the appropriate functional leader and governance team.

## Effective date

This baseline applies immediately for new content and campaign activity. Existing evergreen content should be reviewed during its next scheduled refresh.`,
    seo: {
      title: "Global brand safety review requirements",
      metaDescription: "Policy for PepsiCo-branded content review, unsafe placement controls, required approvals, exceptions, and recordkeeping.",
      keywords: ["brand safety", "content review", "campaign approval", "paid media", "claims"],
      summary: "This policy explains when PepsiCo-branded content needs brand safety review, which approvals may be required, and how teams should manage unsafe placement risk.",
      keyQuestions: ["When does content need brand safety review?", "Which approvals are required for branded content?", "What records should campaign owners keep?"],
      entities: ["Brand Safety", "Legal", "Regulatory", "Privacy", "Communications", "Sustainability"],
    },
    topics: ["Brand safety", "Content governance", "Campaign approvals"],
    aliases: ["brand safety global", "campaign review", "content approval policy"],
    owner: "Global Brand Governance",
    references: source("Global brand and content governance baseline", "Demo baseline covering branded content, claim substantiation, unsafe adjacency, approvals, and campaign recordkeeping."),
  },
  corporateCardUs: {
    title: "How to request a corporate credit card",
    lead: "Use this article when your role requires a corporate card for approved business travel, customer visits, field work, or recurring business expenses.",
    body: `# How to request a corporate credit card

A corporate credit card may be issued when your role requires approved business spending and your manager confirms the need. The card is for business expenses only and must be used according to travel, expense, and purchasing policies.

## Summary

Corporate card requests are submitted through the expense or service portal and require manager approval. Some roles are automatically eligible; others require a business justification. Do not use a personal card for recurring business expenses if a corporate card is required for your role.

## Who this applies to

This article applies to U.S. and Canada employees who travel for business, manage approved recurring expenses, or need a card for field/customer activity.

Contractors and temporary workers may require a different approval path or may not be eligible, depending on role and local policy.

## Before you start

- Confirm with your manager that a corporate card is required.
- Review the travel and expense policy for allowable purchases.
- Make sure your employee profile, cost center, manager, and work location are current.
- Complete any required cardholder training or policy acknowledgement.

## Steps

1. Open the expense or service portal from MyPepsiCo.
2. Search for **Corporate card request**.
3. Confirm your employee details and cost center.
4. Select the card type that matches your business need.
5. Enter the business justification, expected spend type, and travel frequency.
6. Submit the request for manager approval.
7. Complete any cardholder acknowledgement sent after approval.
8. Activate the card when it arrives and add it to the approved expense tool if required.

## Common situations

### You need the card for an upcoming trip

Submit the request as early as possible. If the trip is urgent, ask your manager whether a temporary purchasing or travel exception is available.

### Your manager changed recently

Update your employee profile before submitting. Requests routed to the wrong manager may need to be canceled and resubmitted.

### The card arrives with the wrong name or address

Do not activate the card. Open a support case and attach a photo of the mailer without exposing the full card number.

### A charge is declined

Check whether the merchant type, amount, or country is restricted. If the charge is business-critical, contact card support and notify your manager.

## Need help?

Contact the T&E support team for policy questions, card delivery issues, declined transactions, or expense tool setup.`,
    seo: {
      title: "Request a corporate credit card",
      metaDescription: "How eligible employees request a corporate card, get manager approval, complete acknowledgement, and resolve common card issues.",
      keywords: ["corporate card", "travel expense", "manager approval", "T&E", "business expenses"],
      summary: "This article explains how employees request a corporate credit card for approved business expenses, including eligibility, manager approval, activation, and support paths.",
      keyQuestions: ["How do I request a corporate credit card?", "Who is eligible for a corporate card?", "What do I do if my corporate card is declined?"],
      entities: ["Corporate card", "T&E", "MyPepsiCo", "expense portal"],
    },
    topics: ["Travel and expense", "Corporate card", "Business spending"],
    aliases: ["company credit card", "request corporate card", "travel card"],
    owner: "Travel and Expense Operations",
    references: source("Travel and expense card request standard", "Demo support guidance for corporate card eligibility, manager approval, activation, and declined transaction support."),
  },
  corporateCardBr: {
    title: "Cartão corporativo: como solicitar",
    lead: "Use este artigo quando sua função no Brasil exigir um cartão corporativo para viagens de negócios, visitas a clientes, despesas recorrentes aprovadas ou atividades de campo.",
    body: `# Cartão corporativo: como solicitar

O cartão corporativo pode ser emitido quando a função exige despesas de negócio aprovadas e o gestor confirma a necessidade. O cartão deve ser usado somente para fins profissionais e conforme as políticas de viagens, despesas e compras.

## Resumo

As solicitações de cartão corporativo são feitas pelo portal de despesas ou atendimento e exigem aprovação do gestor. Algumas funções são elegíveis por padrão; outras exigem justificativa de negócio.

## A quem se aplica

Este artigo se aplica a colaboradores no Brasil que viajam a trabalho, realizam visitas a clientes, atuam em campo ou gerenciam despesas recorrentes aprovadas.

Terceiros e trabalhadores temporários podem ter um fluxo diferente de aprovação, conforme a política local.

## Antes de começar

- Confirme com seu gestor se o cartão é necessário para sua função.
- Revise a política de viagens e despesas.
- Verifique se seu centro de custo, gestor e endereço profissional estão atualizados.
- Conclua qualquer treinamento ou aceite obrigatório de portador de cartão.

## Passos

1. Acesse o portal de despesas ou atendimento pelo MyPepsiCo.
2. Pesquise por **Solicitação de cartão corporativo**.
3. Confirme seus dados, centro de custo e gestor.
4. Selecione o tipo de cartão adequado à necessidade de negócio.
5. Informe a justificativa, tipo de despesa e frequência esperada de uso.
6. Envie a solicitação para aprovação.
7. Conclua o aceite de responsabilidade quando solicitado.
8. Ative o cartão somente após confirmar que os dados estão corretos.

## Situações comuns

### Preciso do cartão para uma viagem próxima

Envie a solicitação o quanto antes. Se a viagem for urgente, fale com seu gestor sobre alternativas temporárias permitidas pela política.

### O pedido foi encaminhado ao gestor errado

Atualize seus dados no perfil do colaborador e confirme se a alteração foi sincronizada antes de reenviar a solicitação.

### O cartão chegou com dados incorretos

Não ative o cartão. Abra um chamado e inclua uma foto da correspondência sem expor o número completo do cartão.

### Uma compra foi recusada

Verifique se o tipo de estabelecimento, valor ou país é permitido. Para despesas críticas, contate o suporte de cartões e avise seu gestor.

## ¿Necesita ayuda?

Entre em contato com o suporte de viagens e despesas para dúvidas sobre elegibilidade, entrega, ativação, transações recusadas ou configuração no sistema de despesas.`,
    seo: {
      title: "Cartão corporativo: como solicitar",
      metaDescription: "Como colaboradores no Brasil solicitam cartão corporativo, obtêm aprovação do gestor, ativam o cartão e resolvem problemas comuns.",
      keywords: ["cartão corporativo", "despesas", "viagens", "aprovação do gestor", "Brasil"],
      summary: "Este artigo explica como solicitar cartão corporativo no Brasil, incluindo elegibilidade, aprovação do gestor, ativação e suporte para problemas comuns.",
      keyQuestions: ["Como solicitar cartão corporativo?", "Quem pode ter cartão corporativo?", "O que fazer se uma compra for recusada?"],
      entities: ["Cartão corporativo", "MyPepsiCo", "Viagens e Despesas"],
    },
    topics: ["Viagens e despesas", "Cartão corporativo", "Brasil"],
    aliases: ["solicitar cartão corporativo", "cartão de despesas", "cartão de viagem"],
    owner: "Travel and Expense Brazil",
    references: source("Padrão de solicitação de cartão corporativo", "Orientação demonstrativa para elegibilidade, aprovação, ativação e suporte de cartão corporativo no Brasil."),
  },
  expenseReport: {
    title: "How to submit an expense report",
    lead: "Use this article when you need to submit business expenses for reimbursement or reconcile charges made on a corporate card after approved work travel or business activity.",
    body: `# How to submit an expense report

Submit business expenses promptly so your manager, Finance, and Travel and Expense teams can review the cost while the trip or purchase is still fresh. A complete report includes a clear business purpose, itemized receipts, accurate expense categories, and any required attendee or customer details.

## Summary

Expense reports should be submitted through the approved expense tool within the required submission window for your market. U.S. employees should submit reports within 30 days of the trip end date or purchase date unless a stricter team rule applies.

Use a corporate card when one has been issued for the expense type. If you paid with personal funds for an approved business expense, submit the reimbursement request in the same tool and select the appropriate payment method.

## Who this applies to

This article applies to U.S. and Canada employees who travel for business, host approved customer or team meetings, purchase approved supplies, or reconcile corporate card charges.

Contractors, temporary workers, and employees outside this market may have a different reimbursement path. Follow local policy when it is stricter than this article.

## Before you start

- Confirm the expense was approved and has a valid business purpose.
- Gather itemized receipts, not only credit card slips.
- Confirm the right cost center, project code, or customer activity code.
- Add attendee names for meals, events, or customer meetings when required.
- Separate personal purchases from business expenses before submitting.

## Steps

1. Open the expense tool from MyPepsiCo or the Travel and Expense page.
2. Start a new report and choose the report type that matches the activity.
3. Add the trip, meeting, or purchase purpose in plain language.
4. Import corporate card charges or add reimbursable expenses manually.
5. Attach itemized receipts and match each receipt to the correct expense line.
6. Choose the right category, date, currency, and payment method for each expense.
7. Add attendees, customer names, mileage details, or project codes when prompted.
8. Review policy warnings and correct any missing information.
9. Submit the report for manager approval.
10. Watch for approval or correction messages until the report is paid or fully reconciled.

## Common situations

### A receipt is missing

Use the missing receipt process only after you have tried to recover the receipt from the merchant, hotel, airline, or card provider. Add a note explaining what was purchased, why the receipt is unavailable, and who approved the expense.

### A corporate card charge is wrong

Do not delete the charge. Add notes and contact card support if the merchant, amount, or currency appears incorrect. Disputed charges still need to be tracked in the expense tool.

### The report is returned for correction

Open the returned report, read the approver comments, correct the specific lines, and resubmit. Do not create a duplicate report unless Travel and Expense support asks you to.

### The expense is older than the submission window

Submit the report with an explanation and notify your manager. Late reports may require additional approval or may not be reimbursable depending on the policy.

## Need help?

Contact Travel and Expense support for policy questions, rejected reports, card reconciliation issues, or payment status. Include the report number, expense date, amount, and the approver comment if the report was returned.`,
    seo: {
      title: "Submit an expense report",
      metaDescription: "How to submit a complete business expense report with receipts, business purpose, approvals, and common correction steps.",
      keywords: ["expense report", "reimbursement", "corporate card", "receipts", "travel"],
      summary: "This article explains how employees submit business expenses, attach receipts, resolve returned reports, and contact Travel and Expense support.",
      keyQuestions: ["How do I submit an expense report?", "What receipts do I need?", "What if my expense report is returned?"],
      entities: ["Travel and Expense", "MyPepsiCo", "corporate card", "expense tool"],
    },
    topics: ["Travel and expense", "Reimbursement", "Corporate card"],
    aliases: ["expense reimbursement", "submit receipts", "reconcile corporate card", "travel expenses"],
    owner: "Travel and Expense Operations",
    references: source("Travel and expense submission standard", "Demo support guidance for submitting expense reports, receipt requirements, approver corrections, and corporate card reconciliation."),
  },
  benefitsEnrollment: {
    title: "Benefits enrollment hub",
    lead: "Use this hub to understand when to enroll in benefits, what choices usually require action, and where to go when you have a qualifying life event.",
    body: `# Benefits enrollment hub

Benefits enrollment is the process employees use to choose or update health, insurance, savings, and other eligible programs. This hub gives employees a practical starting point before they open the enrollment tool.

## Overview

Most benefits choices are made when you join PepsiCo, during annual enrollment, or after a qualifying life event. Some benefits can be updated year-round, while others are locked until the next enrollment window unless a life event allows a change.

Read each option carefully before submitting. Benefit elections can affect payroll deductions, dependent coverage, tax treatment, and whether you need to provide documentation.

## Enrollment windows

| When | What you can usually do |
|---|---|
| New hire enrollment | Choose eligible benefits after your employee record is active. |
| Annual enrollment | Review and update coverage for the next plan year. |
| Qualifying life event | Change eligible coverage after events such as marriage, birth, adoption, divorce, or loss of other coverage. |
| Year-round updates | Update certain savings, beneficiary, or voluntary programs when allowed by plan rules. |

## Before you start

- Confirm your home address, work location, and dependent information are current.
- Gather Social Security numbers or local tax identifiers for dependents if required.
- Review plan costs, coverage levels, provider networks, and payroll deduction impact.
- Check whether documentation is needed for a dependent or life event.
- Decide beneficiaries for applicable life insurance or savings programs.

## Key resources

### Health and welfare coverage

Review medical, dental, vision, prescription, disability, and life insurance options in the benefits portal. Compare the full plan details before choosing coverage, especially if you are adding dependents or changing plans.

### Life events

Submit qualifying life events as soon as possible. The event date drives the deadline and the effective date of the change. If documentation is required, upload it before the case deadline.

### Beneficiaries

Keep beneficiaries current for life insurance, retirement, and savings programs. Beneficiary updates are often separate from health plan enrollment, so confirm each program individually.

### Payroll deductions

Review the per-paycheck cost before submitting elections. If deductions do not look right on your first applicable paycheck, open a payroll or benefits case with a screenshot of your confirmation.

## Common situations

### You missed annual enrollment

Contact Benefits support to understand whether any correction window exists. If the window is closed, you may need a qualifying life event before changing locked coverage.

### A dependent is pending verification

Upload the requested documentation by the deadline. Coverage can be delayed or removed if verification is not completed.

### Your life event is not listed

Open a benefits case and describe the event. The support team can confirm whether plan rules allow a change.

## Need help?

Use the benefits portal or MyPepsiCo support to open a case. Include your employee ID, event date, plan or benefit name, and a copy of your enrollment confirmation if you have one.`,
    seo: {
      title: "Benefits enrollment hub",
      metaDescription: "Employee guide to benefits enrollment windows, life events, dependent verification, beneficiaries, and where to get support.",
      keywords: ["benefits", "enrollment", "life event", "dependents", "beneficiaries"],
      summary: "This hub explains how employees prepare for benefits enrollment, update elections after life events, verify dependents, and get support.",
      keyQuestions: ["When can I enroll in benefits?", "How do I update benefits after a life event?", "What should I check before submitting elections?"],
      entities: ["Benefits portal", "MyPepsiCo", "Human Resources", "Payroll"],
    },
    topics: ["Benefits", "Enrollment", "HR support"],
    aliases: ["open enrollment", "benefits life event", "dependent verification", "beneficiary update"],
    owner: "Benefits Operations",
    references: source("Benefits enrollment support standard", "Demo guidance for enrollment windows, qualifying life events, dependent verification, and employee support routing."),
  },
  conductRefresh: {
    title: "Code of Conduct annual acknowledgement",
    lead: "Use this article to understand the annual Code of Conduct acknowledgement, why employees must complete it, and what to do if the training or sign-off does not appear.",
    body: `# Code of Conduct annual acknowledgement

PepsiCo's Global Code of Conduct sets expectations for how employees and others working on behalf of the company act with integrity. The annual acknowledgement confirms that employees have reviewed the current Code, understand where to ask questions, and know how to raise concerns.

## Summary

The Code covers topics such as respect in the workplace, trust in the marketplace, fairness in business relationships, honest business conduct, and acting responsibly in the world. Employees are expected to complete the assigned acknowledgement by the due date shown in the learning system.

The acknowledgement does not replace local policies, job-specific training, or manager guidance. Follow the strictest applicable requirement when local law, policy, or customer commitments add additional obligations.

## Who this applies to

This policy applies globally to employees and, where assigned, contractors or third parties working on behalf of PepsiCo.

Managers are responsible for completing their own acknowledgement and encouraging their teams to finish required training on time.

## Policy details

### What employees must do

Employees must review the assigned Code materials, complete any required learning module, answer acknowledgement questions honestly, and submit completion before the due date.

### What managers must do

Managers should monitor completion reminders, allow reasonable time for employees to complete the assignment, and route questions to Human Resources, Legal, or Global Compliance and Ethics.

### When to ask for guidance

Ask for guidance when a situation involves a potential conflict of interest, pressure to change records, gifts or hospitality, harassment, discrimination, retaliation, safety risk, privacy concern, or anything that may violate the Code or law.

### Reporting concerns

Employees can raise concerns through a manager, Human Resources, Legal, Global Compliance and Ethics, or Speak Up. PepsiCo prohibits retaliation against good-faith reports and cooperation with investigations.

## Exceptions

If you are on leave or cannot access the learning system before the due date, contact your manager or HR representative. Do not ask another person to complete the acknowledgement for you.

## Compliance

Incomplete acknowledgements may trigger reminders, manager escalation, or additional follow-up. Failure to follow the Code or required policies may result in corrective action.

## Need help?

For technical issues, open a learning support case. For ethics or policy questions, contact Global Compliance and Ethics, Legal, HR, or Speak Up.`,
    seo: {
      title: "Code of Conduct annual acknowledgement",
      metaDescription: "What employees need to know about the annual Code of Conduct acknowledgement, reporting concerns, non-retaliation, and support.",
      keywords: ["Code of Conduct", "acknowledgement", "ethics", "Speak Up", "compliance"],
      summary: "This article explains the annual Code acknowledgement, employee and manager responsibilities, reporting channels, and escalation paths.",
      keyQuestions: ["How do I complete the Code acknowledgement?", "What does the Code cover?", "Where do I report a concern?"],
      entities: ["Global Code of Conduct", "Speak Up", "Global Compliance and Ethics", "Human Resources", "Legal"],
    },
    topics: ["Ethics and compliance", "Code of Conduct", "Annual acknowledgement"],
    aliases: ["code sign off", "annual ethics training", "conduct acknowledgement"],
    owner: "Global Compliance and Ethics",
    references: publicSource("PepsiCo Global Code of Conduct", "https://www.pepsico.com/about/global-code-of-conduct", "Public PepsiCo guidance describes the Code, Speak Up, confidentiality, anonymity where permitted, and non-retaliation."),
  },
  holidaySchedule: {
    title: "Holiday schedule 2026",
    lead: "Use this FAQ to understand where to find your 2026 holiday calendar, how holidays differ by country or site, and what to do if your schedule does not match the published calendar.",
    body: `# Holiday schedule 2026

Holiday schedules vary by country, state or province, business unit, union agreement, and site operating needs. Always use the calendar assigned to your employee profile or work location.

## Summary

Corporate calendars usually list observed company holidays for office employees. Manufacturing, warehouse, field, sales, and customer-facing teams may follow site-specific schedules because operations need coverage during peak periods or customer commitments.

Your manager or local HR team can confirm how holidays are handled for your role, including premium pay, floating holidays, or alternate days off.

## Questions

### Where do I find my holiday calendar?

Open MyPepsiCo and search for **holiday calendar**. Choose the calendar for your country, business unit, and site. If the article lists multiple calendars, use the one that matches your work location in your employee profile.

### Why is my team's schedule different from the corporate calendar?

Some teams operate on customer, production, or route schedules. A site may observe a holiday on a different date, assign coverage rotations, or provide another day off based on local rules.

### What if I recently transferred locations?

Check that your employee profile reflects the new work location. Holiday eligibility usually follows the active work location and role, not the location you transferred from.

### Do holidays affect payroll deadlines?

Yes. Payroll deadlines may move earlier when a holiday falls near the normal submission or approval cutoff. Managers should approve time as early as possible during holiday weeks.

### How do floating holidays work?

Floating holidays depend on country, role, and plan rules. Use the timekeeping or absence tool to check your available balance and any use-by date.

### What if I am scheduled to work on a holiday?

Talk to your manager before the holiday. Your pay, alternate day off, or premium treatment depends on role, country, site policy, and local law.

## Need help?

Contact your manager for schedule questions. Contact HR or Payroll support if the calendar, timekeeping tool, or paycheck does not match your approved schedule.`,
    seo: {
      title: "Holiday schedule 2026",
      metaDescription: "FAQ for finding the right 2026 holiday calendar, understanding site differences, floating holidays, payroll deadlines, and support paths.",
      keywords: ["holiday schedule", "2026", "calendar", "floating holiday", "payroll"],
      summary: "This FAQ explains how employees find the right holiday calendar, why schedules differ, and who to contact about holidays, timekeeping, or payroll.",
      keyQuestions: ["Where is the 2026 holiday calendar?", "Why is my site schedule different?", "What if I work on a holiday?"],
      entities: ["MyPepsiCo", "Human Resources", "Payroll", "Timekeeping"],
    },
    topics: ["Holidays", "Timekeeping", "Payroll"],
    aliases: ["company holidays", "2026 calendar", "floating holiday", "site holiday schedule"],
    owner: "HR Operations",
    references: source("Holiday calendar support standard", "Demo support guidance for country, site, and role-based holiday calendars and payroll impacts."),
  },
  myPepsiCoPortal: {
    title: "Guía de uso del portal MyPepsiCo",
    lead: "Use esta guía para ingresar a MyPepsiCo, encontrar herramientas comunes y saber qué hacer cuando una página, solicitud o notificación no aparece como esperaba.",
    body: `# Guía de uso del portal MyPepsiCo

MyPepsiCo es el punto de entrada para herramientas, comunicaciones, capacitación, servicios de RH, soporte de TI y recursos para colaboradores. Esta guía ayuda a encontrar información sin depender de enlaces guardados o mensajes antiguos.

## Resumen

Use MyPepsiCo para acceder a servicios de empleado, solicitudes de soporte, noticias internas, aprendizaje, herramientas de trabajo y recursos por país o función. El contenido que ve puede variar por mercado, ubicación, perfil de seguridad, idioma y tipo de colaborador.

Si una herramienta no aparece, puede deberse a permisos, ubicación laboral, rol, país o una sincronización pendiente del perfil.

## A quién aplica

Esta guía aplica a colaboradores de PepsiCo México y a equipos que usan MyPepsiCo como portal principal. Algunos enlaces o nombres de herramientas pueden variar en otros mercados.

## Antes de empezar

- Tenga a la mano su usuario corporativo.
- Confirme que su método de autenticación multifactor esté activo.
- Use un navegador actualizado o la aplicación móvil aprobada.
- Revise que su país, ubicación y gerente estén correctos en el perfil del colaborador.

## Cómo ingresar

1. Abra MyPepsiCo desde un navegador o dispositivo aprobado.
2. Ingrese con su usuario corporativo.
3. Complete la autenticación multifactor si se solicita.
4. Revise la página de inicio para ver accesos rápidos, tareas pendientes y anuncios.
5. Use la búsqueda para encontrar servicios por palabra clave, no solo por nombre exacto.

## Cómo encontrar recursos

### Solicitudes de RH

Busque temas como beneficios, ausencias, datos personales, documentos laborales, nómina o actualización de información bancaria. Lea el artículo antes de abrir un caso para confirmar requisitos y documentos.

### Soporte de TI

Use MyIT o el enlace de soporte para reportar problemas de contraseña, acceso, equipo, aplicaciones, VPN o dispositivo móvil. Incluya capturas de pantalla y el mensaje de error.

### Aprendizaje

Abra el área de capacitación para ver cursos asignados, recursos recomendados y fechas límite. Complete entrenamientos obligatorios antes de la fecha indicada.

### Comunicaciones y noticias

Revise anuncios de su mercado, función o sitio. Algunos comunicados son visibles solo para audiencias específicas.

## Situaciones comunes

### No encuentro una herramienta

Busque por sinónimos y revise los accesos rápidos. Si sigue sin aparecer, confirme con su gerente si requiere acceso adicional.

### La página aparece en otro idioma

Revise las preferencias de idioma del navegador, la aplicación y el perfil. Algunos contenidos se publican primero en el idioma principal del mercado.

### Una solicitud quedó pendiente

Abra el caso original para ver aprobadores, comentarios y fecha estimada. No cree un duplicado a menos que soporte lo solicite.

## Precisa de ajuda?

Abra un caso de soporte desde MyPepsiCo si no puede ingresar, falta una herramienta o la información de su perfil es incorrecta. Incluya el país, dispositivo, navegador y captura del problema.`,
    seo: {
      title: "Guía del portal MyPepsiCo",
      metaDescription: "Cómo ingresar a MyPepsiCo, buscar recursos, abrir solicitudes de RH o TI, y resolver problemas comunes de acceso.",
      keywords: ["MyPepsiCo", "portal", "México", "RH", "soporte TI"],
      summary: "Esta guía explica cómo usar MyPepsiCo para encontrar recursos, solicitudes, aprendizaje, comunicaciones y soporte.",
      keyQuestions: ["¿Cómo ingreso a MyPepsiCo?", "¿Dónde encuentro solicitudes de RH?", "¿Qué hago si no aparece una herramienta?"],
      entities: ["MyPepsiCo", "MyIT", "Recursos Humanos", "TI"],
    },
    topics: ["MyPepsiCo", "Portal del colaborador", "México"],
    aliases: ["portal MyPepsiCo", "guía del colaborador", "soporte MyPepsiCo"],
    owner: "HR Operations Mexico",
    references: source("Guía operativa del portal del colaborador", "Orientación demostrativa para navegación de MyPepsiCo, servicios de RH, soporte de TI y visibilidad por audiencia."),
  },
  vpnTroubleshooting: {
    title: "IT support: VPN troubleshooting",
    lead: "Use this article when VPN will not connect, disconnects repeatedly, or blocks access to internal tools while you are working remotely.",
    body: `# IT support: VPN troubleshooting

VPN connects your approved device to PepsiCo internal services when you are away from the corporate network. Many issues are caused by expired sign-in sessions, weak internet connections, pending device updates, or a mismatch between the application you need and the network path you are using.

## Summary

Try the basic checks first: confirm internet access, restart the VPN client, complete multi-factor authentication, and make sure the device is updated. If VPN connects but a specific application still fails, the issue may be application access rather than VPN.

Do not use personal VPN tools, shared credentials, or unapproved workarounds to reach internal systems.

## Who this applies to

This article applies to employees and contractors using a PepsiCo-managed laptop or approved device to access internal tools from home, hotels, customer sites, or other remote locations.

## Before you start

- Confirm you are using a company-managed or approved device.
- Check that your internet connection works outside VPN.
- Close duplicate VPN windows.
- Keep your authenticator device nearby.
- Save your work before restarting the computer.

## Steps

1. Disconnect VPN if it is partially connected.
2. Open a normal website to confirm the internet connection works.
3. Restart the VPN client.
4. Sign in with your PepsiCo credentials and complete multi-factor authentication.
5. Wait until the VPN status says connected.
6. Open the internal application in a new browser window.
7. If the app fails, try one additional internal site to see whether the issue is broad or app-specific.
8. Restart the laptop if VPN still fails after one reconnect attempt.

## Common situations

### VPN accepts your password but never connects

Check for pending device updates and restart the laptop. If the issue continues, capture the VPN error code and contact IT support.

### Multi-factor authentication times out

Make sure your phone has service and that the authenticator notification is not blocked. Use a backup method if one is registered.

### VPN connects but one application is unavailable

Open a ticket for the application if other internal tools work. Include the application name, URL, error message, and whether the issue happens only on VPN.

### You are traveling internationally

Some countries, hotel networks, and public Wi-Fi providers restrict VPN traffic. Try a trusted alternate network if available, and contact IT before using any workaround.

## Need help?

Open a MyIT ticket under **Network and VPN**. Include the device name, location, network type, VPN error code, time of issue, and whether other internal applications work.`,
    seo: {
      title: "VPN troubleshooting",
      metaDescription: "Employee steps for fixing VPN connection, MFA, device update, and app access issues while working remotely.",
      keywords: ["VPN", "remote work", "network", "MFA", "IT support"],
      summary: "This article helps employees troubleshoot VPN connection failures, repeated disconnects, MFA timeouts, and app-specific access issues.",
      keyQuestions: ["Why won't VPN connect?", "What if VPN connects but an app does not work?", "What details should I include in a VPN ticket?"],
      entities: ["VPN", "MyIT", "multi-factor authentication", "IT Service Desk"],
    },
    topics: ["IT support", "VPN", "Remote access"],
    aliases: ["remote access", "VPN not connecting", "network issue", "work from home access"],
    owner: "Network Support",
    references: source("Remote access troubleshooting standard", "Demo support guidance for VPN connectivity, multi-factor authentication, device compliance, and ticket routing."),
  },
  directDeposit: {
    title: "How to update your direct deposit account",
    lead: "Use this article when you need to add, replace, or verify the bank account used for payroll direct deposit.",
    body: `# How to update your direct deposit account

Direct deposit sends payroll to the bank account or accounts saved in your employee payroll profile. Keep this information current whenever you change banks, close an account, or need to split pay between accounts.

## Summary

Update direct deposit only in the approved payroll or employee self-service tool. Changes may take one or more payroll cycles to become active depending on timing, validation, and local payroll cutoff dates.

Do not send bank account details by email or chat unless Payroll support specifically provides an approved secure upload path.

## Who this applies to

This article applies to employees who receive pay through direct deposit in supported markets. Some countries use different payment methods or require local documentation.

## Before you start

- Confirm the bank account is open and in your name or allowed by local policy.
- Have the routing number, account number, bank name, and account type ready.
- Check payroll cutoff dates before making a change near payday.
- Keep the old account open until the first successful deposit reaches the new account.

## Steps

1. Open MyPepsiCo and go to the payroll or employee self-service area.
2. Select **Direct deposit** or **Payment elections**.
3. Add the new account or edit the existing account.
4. Enter the routing, account, and account type details carefully.
5. Choose the deposit amount, percentage, or balance rule.
6. Review the confirmation screen before submitting.
7. Save or print the confirmation for your records.
8. Check your next payslip to confirm the deposit went to the expected account.

## Common situations

### You changed accounts close to payday

The change may not apply until the next payroll cycle. Keep the previous account open until Payroll confirms the new account is active.

### You entered the wrong account number

Contact Payroll support immediately. Do not wait until payday. Provide the confirmation number and the date you submitted the change.

### You want to split pay between accounts

Use a percentage, fixed amount, or remaining balance rule if your market supports split deposits. Confirm the order of accounts before submitting.

### Your bank rejected the deposit

Open a payroll case and contact the bank. Payroll may need to reissue the payment after the bank returns the funds.

## Need help?

Open a Payroll support case through MyPepsiCo. Include the change date, confirmation number, pay date, and the last four digits of the account only.`,
    seo: {
      title: "Update direct deposit",
      metaDescription: "How employees update payroll direct deposit, avoid cutoff issues, split pay, and contact Payroll support for errors.",
      keywords: ["direct deposit", "payroll", "bank account", "payment elections", "paycheck"],
      summary: "This article explains how to update direct deposit details, check payroll timing, avoid account errors, and get help from Payroll.",
      keyQuestions: ["How do I update direct deposit?", "When will my bank change take effect?", "What if I entered the wrong account number?"],
      entities: ["Payroll", "MyPepsiCo", "direct deposit", "payment elections"],
    },
    topics: ["Payroll", "Direct deposit", "Employee self-service"],
    aliases: ["update banking details", "change payroll account", "payment elections", "paycheck bank account"],
    owner: "Payroll Operations",
    references: source("Payroll direct deposit support standard", "Demo guidance for secure direct deposit updates, payroll cutoffs, split deposits, and bank rejection handling."),
  },
  travelExpensePolicy: {
    title: "Travel and expense policy update",
    lead: "Use this policy article to understand the current travel booking and expense expectations for U.S. and Canada employees before booking business travel or submitting reimbursement.",
    body: `# Travel and expense policy update

Travel and expense rules help PepsiCo manage employee safety, negotiated rates, tax requirements, and timely reimbursement. This update summarizes the expected booking and reporting behavior for business travel.

## Summary

Employees should book business travel through the approved travel tool unless an exception applies. Expenses should be reasonable, business-related, supported by receipts when required, and submitted within the required window.

Out-of-policy expenses may be delayed, returned for correction, or denied unless there is an approved exception.

## Who this applies to

This policy applies to U.S. and Canada employees who travel for business, host approved meetings, or submit reimbursable business expenses.

## Policy details

### Booking travel

Book air, hotel, and rental car through the approved travel tool when available. This supports negotiated rates, duty-of-care visibility, and easier expense matching.

### Business purpose

Every trip and expense report must include a clear business purpose. Use plain language that explains the meeting, customer activity, site visit, training, or project work.

### Receipts and documentation

Attach itemized receipts where required. For meals or events, include attendees and the business relationship when the tool asks for it.

### Corporate card use

Use the corporate card for approved business expenses when one has been issued. Reconcile card charges in the expense tool even when reimbursement is not owed to you.

### Exceptions

Exceptions may apply for emergency travel, system outages, customer-directed travel, or locations not supported by the approved tool. Add an explanation and approval evidence to the expense report.

## Compliance

Reports with missing receipts, unclear business purpose, personal charges, late submission, or unapproved booking paths may be returned to the employee or escalated to the manager.

## Need help?

Contact Travel and Expense support before booking if you are unsure whether an exception applies. For returned reports, read the approver comment, correct the report, and resubmit the same report.`,
    seo: {
      title: "Travel and expense policy update",
      metaDescription: "Current expectations for business travel booking, receipts, corporate card reconciliation, exceptions, and expense report compliance.",
      keywords: ["travel policy", "expense policy", "corporate card", "booking", "receipts"],
      summary: "This policy explains approved travel booking, business purpose, receipts, corporate card use, exceptions, and returned report handling.",
      keyQuestions: ["How should I book business travel?", "What expenses require receipts?", "When is an exception allowed?"],
      entities: ["Travel and Expense", "corporate card", "expense tool", "approved travel tool"],
    },
    topics: ["Travel and expense", "Policy", "Business travel"],
    aliases: ["T&E policy", "travel booking", "expense rules", "out of policy expense"],
    owner: "Travel and Expense Operations",
    references: source("Travel and expense policy baseline", "Demo baseline for approved booking paths, receipt requirements, corporate card use, exception handling, and report compliance."),
  },
  learningHub: {
    title: "How to find learning and career development resources",
    lead: "Use this article when you want to find required training, build role-specific skills, explore career growth resources, or understand which learning platform to use.",
    body: `# How to find learning and career development resources

PepsiCo offers learning resources for required training, functional skills, leadership development, digital skills, education programs, and career growth. The right starting point depends on whether you need to complete an assignment, build a skill, or explore your next role.

## Summary

Use the learning platform for assigned training, recommended courses, and self-directed learning. Use career development resources when you want to identify skills, explore internal opportunities, or prepare for a future role.

PepsiCo's public learning and development materials describe a mix of virtual, in-person, self-paced, leadership, functional, digital, education, and broadening experiences. Internally, employees should follow the tools and eligibility rules shown in their market.

## Who this applies to

This article applies to employees looking for training, career development, education support, or skill-building resources. Eligibility may vary by country, role, employment type, and program.

## Before you start

- Decide whether you are completing required training or exploring optional development.
- Check the due date for required learning.
- Talk with your manager about development goals before enrolling in time-intensive programs.
- Confirm eligibility before applying for education or broadening-assignment programs.

## Steps

1. Open MyPepsiCo and go to the learning or career development area.
2. Check assigned learning first and complete required items before the due date.
3. Search by skill, function, role, or topic for optional learning.
4. Save relevant courses or resources to a development plan.
5. Discuss larger programs, education support, or stretch assignments with your manager.
6. Track completion and apply the learning in your role.

## Common situations

### You cannot find an assigned course

Search by the exact course name and check whether your employee profile, market, or role recently changed. If the assignment is still missing, open a learning support case.

### A course is overdue

Complete it as soon as possible and notify your manager if the overdue item affects access, compliance, or role readiness.

### You want to change roles

Use career development resources to compare required skills, identify learning gaps, and prepare for internal opportunities. Your manager or HR partner can help connect development goals to business needs.

### You are interested in education support

Review program eligibility, covered programs, manager discussion expectations, and required documentation before applying.

## Need help?

Contact Learning support for platform issues. Contact your manager or HR partner for development planning, program eligibility, or role-move questions.`,
    seo: {
      title: "Find learning and career development resources",
      metaDescription: "How employees find assigned training, skill resources, career development tools, and education support.",
      keywords: ["learning", "career development", "training", "PEP U", "myeducation"],
      summary: "This article guides employees to learning and career development resources, including assigned training, optional learning, education support, and manager discussions.",
      keyQuestions: ["Where do I find required training?", "How do I build skills for my role?", "Where do I learn about education support?"],
      entities: ["MyPepsiCo", "Learning support", "HR", "manager"],
    },
    topics: ["Learning and development", "Career growth", "Training"],
    aliases: ["required training", "career development", "education support", "PEP U", "myeducation"],
    owner: "Global Learning Center of Excellence",
    references: publicSource("PepsiCo employee learning and development", "https://www.pepsico.com/esg-topics/employee-learning-and-development", "Public PepsiCo materials describe learning, PEP U Degreed, myeducation, myDevelopment, and broadening experiences."),
  },
};

const idMap = new Map([
  ["pub-317cf3af", articles.driverToken],
  ["ka-e9c06de7", articles.driverToken],
  ["pub-f26eac74", articles.speakUp],
  ["ka-e351ccda", articles.speakUp],
  ["pub-96bd4e0c", articles.speakUp],
  ["ka-ee1aaec5", articles.speakUp],
  ["pub-bfe65183", articles.resetPassword],
  ["pub-568e7dd8", articles.resetPassword],
  ["ka-568e7dd8", articles.resetPassword],
  ["pub-a58d787d", articles.access],
  ["ka-2058f693", articles.access],
  ["ka-a1d8c5a3", articles.access],
  ["pub-8b00d755", articles.brandSafety],
  ["pub-d11b2d4c", articles.brandSafety],
  ["ka-56dc0320", articles.brandSafety],
  ["ka-0b70c32c", articles.brandSafety],
  ["ka-b5664394", articles.brandSafety],
  ["ka-ce852761", articles.brandSafety],
  ["ka-272b8f5b", articles.brandSafety],
  ["pub-fec0f30f", articles.corporateCardUs],
  ["ka-fec0f30f", articles.corporateCardUs],
  ["pub-4080ad22", articles.corporateCardBr],
  ["pub-b325e41b", articles.corporateCardBr],
  ["ka-b325e41b", articles.corporateCardBr],
  ["pub-001", articles.expenseReport],
  ["ka-001", articles.expenseReport],
  ["ka-006", articles.benefitsEnrollment],
  ["ka-009", articles.conductRefresh],
  ["pub-010", articles.holidaySchedule],
  ["ka-010", articles.holidaySchedule],
  ["ka-011", articles.myPepsiCoPortal],
  ["pub-ea628539", articles.vpnTroubleshooting],
  ["ka-aa18fedf", articles.directDeposit],
  ["ka-7a359c98", articles.directDeposit],
  ["ka-618766e0", articles.directDeposit],
  ["ka-f97f1ba8", articles.directDeposit],
  ["ka-103d3404", articles.directDeposit],
  ["ka-012", articles.travelExpensePolicy],
  ["ka-demo-glb1", articles.speakUp],
  ["ka-004", articles.learningHub],
]);

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const row of data) {
    const update = idMap.get(row.id);
    if (!update) continue;
    row.title = update.title;
    row.body = update.body;
    row.lead = update.lead;
    row.seo = update.seo;
    row.topics = update.topics;
    row.aliases = update.aliases;
    row.references = update.references;
    row.owner = update.owner;
    row.canonicalSlug = slug(update.title);
    row.nextReviewAt = row.nextReviewAt ?? nextReview();
    row.relatedArticleIds = row.relatedArticleIds ?? [];
    row.visibility = row.visibility ?? {
      audiences: ["All employees"],
      markets: [String(row.market ?? "US").toLowerCase()],
      countries: row.countries ?? [],
      security: "all-employees",
      notes: "Visible to employees in the selected audience, market, and country scope.",
    };
  }
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
