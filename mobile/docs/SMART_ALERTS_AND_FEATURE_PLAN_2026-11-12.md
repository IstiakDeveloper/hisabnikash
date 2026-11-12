# HisabNikash — বাজেট, দৈনিক হিসাব ও স্মার্ট নোটিফিকেশন প্ল্যান

বাস্তবায়নের আপডেট: [০.৩.০-এর সম্পন্ন কাজ, পরীক্ষা ও সীমা](IMPLEMENTATION_0.3.0_2026-11-12.md)। নিচের লেখাটি মূল প্রস্তাবিত প্ল্যান।

তারিখ: ১২ নভেম্বর ২০২৬ · Asia/Dhaka

অবস্থা: প্রস্তাবিত কাজের পরিকল্পনা। এই ডকুমেন্ট অ্যাপের আচরণ পরিবর্তন বা নতুন নোটিফিকেশন চালু করে না।

## ১. বর্তমান অবস্থায় কী আছে, কী নেই

বর্তমান Flutter মোবাইল অ্যাপকে প্রথম লক্ষ্য ধরা হয়েছে। Laravel ওয়েব অ্যাপ আলাদা হিসাবের ডেটা ব্যবহার করে; মোবাইলের optional sync চালু করলেই ওয়েবের transactions-এর সঙ্গে তা এক হয়ে যায় না।

| বিষয় | কোডে পাওয়া বর্তমান আচরণ | প্রয়োজনীয় সংযোজন |
| --- | --- | --- |
| বাজেট | ক্যাটাগরি ও মাস অনুযায়ী spent, remaining, progress আছে | ৮০/৯০/১০০% সতর্কতা, ব্যালেন্স দিয়ে বাকি পরিকল্পনা মেটানো যাবে কি না |
| ব্যালেন্স | আজ পর্যন্ত posted transactions থেকে account/space balance | সংরক্ষিত টাকা, আসন্ন দায় ও পরিকল্পনা বাদে খরচযোগ্য টাকা |
| বিল | recurring bills, paid/unpaid, overdue প্রদর্শন | configurable reminders, due-day/overdue alerts, budget/category linkage |
| লোকাল নোটিফিকেশন | বিলের আগের দিন সকাল ৯টা; Asia/Dhaka; differential scheduling | দৈনিক রাত ৮টা, daily completion, action/deep link, পৃথক controls |
| সঞ্চয় | goal-এর saved টাকা earmark; account balance বদলায় না | funded বনাম unfunded লক্ষ্য ও সংরক্ষিত টাকার স্পষ্ট হিসাব |
| ঋণ | existing interest-free principal ও repayment | dated installments ছাড়া EMI due ধরে সতর্কতা দেওয়া যাবে না; schedule পরে যোগ হবে |
| Sync | optional, foreground/resume-নির্ভর | notification-এ পুরোনো cloud তথ্যকে বর্তমান বলে দেখানো এড়ানো |
| ওয়েব | dashboard-এ কিছু budget/low-balance/EMI alerts আছে | যাচাই করা console schedule-এ দৈনিক notification job নেই; mobile alerts আলাদা তৈরি করতে হবে |

পর্যালোচিত মূল ফাইল: `lib/core/reminders.dart`, `lib/core/models.dart`, `lib/app/app.dart`, `lib/ui/dashboard.dart`, `lib/ui/plans.dart`, `lib/ui/settings.dart`, এবং Laravel-এর `DashboardController.php` ও `routes/console.php`।

## ২. প্রথম অগ্রাধিকার: দৈনিক হিসাবের রিমাইন্ডার

### ডিফল্ট আচরণ

- ব্যবহারকারী চালু করলে প্রতিদিন রাত **৮টা**, শুরুতে Asia/Dhaka; সময় পরিবর্তন করা যাবে।
- ডিফল্ট: **আজকের হিসাব সম্পূর্ণ না হলে মনে করাও**। বিকল্প: **আজকের তারিখে কোনো এন্ট্রি না থাকলেই মনে করাও**।
- একটি এন্ট্রি দেওয়া মানেই দিনের সব খরচ লেখা শেষ নয়। Dashboard-এ আলাদা **আজকের হিসাব শেষ** এবং **আজ কোনো লেনদেন হয়নি** থাকবে।
- দ্বিতীয় অপশনটিও দিনকে complete করবে; শূন্য টাকার ভুয়া transaction তৈরি করবে না।
- completion ওই স্থানীয় দিনের জন্য; পরের দিন নতুন করে শুরু হবে। পুরো অ্যাপের tracked personal/business spaces মিলিয়ে একবার reminder, space-পিছু আলাদা notification নয়।
- হিসাব শেষ করলে ওই দিনের pending daily reminder বাতিল হবে। পরে একই দিনের transaction যোগ/পরিবর্তন/মুছে দিলে completion আবার review-needed হবে।
- completion দৈনিক reminder থামাবে; budget/bill alerts চলবে। Backdated transaction যোগ করে আজকের হিসাব complete হবে না। Future-dated entry-ও আজকের entry হিসেবে গণনা হবে না।
- notification ট্যাপ → অ্যাপ আনলক → আজকের Activity/হিসাব review। Actions: **লেনদেন যোগ**, **আজ হিসাব শেষ**, **৩০ মিনিট পরে**। আর্থিক তথ্য দেখা বা বদলানো actions app lock মানবে।
- notification language অ্যাপের বাংলা/English setting অনুসরণ করবে।

প্রস্তাবিত বার্তা:

> আজকের আয়-খরচ লেখা শেষ হয়েছে? হিসাব মিলিয়ে নিন।

এন্ট্রি আছে কিন্তু completion হয়নি—অ্যাপের ভেতরে:

> আজ ৩টি লেনদেন লেখা আছে। আর কিছু বাকি আছে কি?

### বন্ধ অ্যাপেও কাজ করার নকশা

- foreground `Timer` দিয়ে রাত ৮টার reminder করা হবে না; OS-এ আগেই local notifications schedule করতে হবে। দৈনন্দিন reminder-এর জন্য cloud login বা internet লাগবে না।
- date-specific reminder দিয়ে শুরু; প্রতিদিনের ID আলাদা। সীমিত rolling horizon schedule হবে এবং notification quota-তে daily ও নিকটবর্তী bill দুটির জায়গা রাখা হবে। দূরের bills দিয়ে সব slot পূরণ করা যাবে না।
- startup/resume, transaction write, completion, settings change, restore এবং sync apply হলে সংশ্লিষ্ট pending reminders refresh হবে। মাঝরাত পার হলে app খোলা অবস্থাতেও নতুন দিন ধরবে।
- অ্যাপ দীর্ঘদিন না খুললে rolling schedule অনন্তকাল চলবে না। তাই release gate: supported horizon স্পষ্ট করা এবং generic repeating fallback বনাম replenishment-এর device-tested ব্যবস্থা বেছে নেওয়া। তার আগে indefinite reminder-এর দাবি করা যাবে না।
- scheduled local message delivery-র মুহূর্তে নিজে database query করে না। তাই notification-এর ভাষা সাধারণ প্রশ্ন হবে; stale তথ্য থেকে “আজ কিছু লেখেননি” বা পুরোনো balance বলা হবে না।
- অন্য ডিভাইসে হিসাব complete হলেও offline ফোন sync না করা পর্যন্ত তা জানবে না। সেই সীমা local reminder-এ থাকবে; sync-এর পর cancel/reconcile হবে।
- OS delivery, battery settings ও permission-এর কারণে ৮টার লক্ষ্য সময়ের পরে notification আসতে পারে। App-এ delivery preference ও permission status দেখাতে হবে।

## ৩. প্রথম অগ্রাধিকার: বাজেট বনাম ব্যালেন্স

### Dashboard-এ চারটি আলাদা তথ্য

1. **বর্তমান ব্যালেন্স** — আজ পর্যন্ত account-এ থাকা recorded টাকা।
2. **বাকি পরিকল্পিত খরচ** — চলতি মাসের বাকি budgets এবং এর বাইরে থাকা আসন্ন দায়; একই খরচ একবার।
3. **পরিকল্পনা মেটানোর পর অবশিষ্ট / ঘাটতি** — ব্যালেন্স থেকে বাকি পরিকল্পিত খরচ বাদ।
4. **দৈনিক খরচের সীমা** — চলতি মাসের অবশিষ্ট discretionary budget এবং দায় বাদে উপলব্ধ টাকা—এই দুটির ছোট অঙ্ক, বাকি দিন দিয়ে ভাগ; ঘাটতি থাকলে ০ ও ঘাটতির ব্যাখ্যা। Fixed/discretionary বিভাজন না থাকলে এই কার্ড দেখানো হবে না।

সব অঙ্ক account/space-এর একই scope এবং একই সময়সীমায় হিসাব হবে। Dashboard-এর পুরোনো মাস নির্বাচন করলে বর্তমান সময়ের alert বদলে যাবে না; historical view আলাদা লেবেল পাবে।

### গণনার নিয়ম

- প্রত্যেক category-র budget remainder = `max(budget - posted net expense, 0)`। Transfers ও loan principal repayment category expense নয়। Corrections/reversals net হবে।
- বাকি বাজেট ভবিষ্যতের পরিকল্পনা; ইতিমধ্যে খরচ হওয়া টাকা আবার বর্তমান balance থেকে বাদ দেওয়া যাবে না।
- চলতি মাসের unpaid/overdue bills ও dated obligations ধরতে হবে। Bill-এর category/budget link যোগ করতে হবে, যাতে ওই বাজেটে অন্তর্ভুক্ত bill আবার যোগ না হয়।
- প্রতি category-তে `required = max(budget remainder, linked unpaid obligations)`। Category-র বাইরে থাকা obligations আলাদা যোগ হবে। একাধিক bill হলে category অনুযায়ী আগে তাদের মোট করতে হবে।
- future-dated transaction ও bill একই দায় বোঝালে stable link দিয়ে একবার গণনা হবে। Scheduled entry actual balance বদলাবে না; forecast-এ দায় হিসেবে যুক্ত হতে পারে।
- balance-এর মধ্যে থাকা সঞ্চয়কে reserved হিসেবে ধরতে হলে backing account/amount allocation প্রয়োজন। একই টাকা reserved account এবং goal—দুই জায়গায় বাদ যাবে না। বর্তমান goal.saved-কে যাচাই ছাড়া funded reserve ধরা যাবে না।
- expected salary বা receivable হাতে না আসা পর্যন্ত current balance-এ যোগ হবে না। পরে আলাদা **সম্ভাব্য cash-flow** view-তে দেখানো যাবে।
- পুরো outstanding loan-কে এই মাসের খরচ বলা যাবে না। নির্দিষ্ট due date/amount থাকলেই এই horizon-এ repayment obligation ধরতে হবে।
- কোনো budget না থাকলে “বাজেট নেই”; কোনো দায়ের ডেটা না থাকলে “কোনো দায় যোগ করা হয়নি”। অসম্পূর্ণ তথ্য থেকে “আপনার টাকা যথেষ্ট” নিশ্চয়তা দেওয়া যাবে না।
- টাকা integer paisa-তেই হিসাব হবে।

উদাহরণ: balance ৳১০,০০০; বাকি বাজেট ৳১২,০০০, যার মধ্যে ৳৩,০০০ unpaid bill রয়েছে। ঘাটতি **৳২,০০০**, ৳৫,০০০ নয়। বাজেটের বাইরে আরও ৳১,০০০ bill থাকলে ঘাটতি **৳৩,০০০**।

প্রস্তাবিত বার্তা:

> এই মাসের বাকি পরিকল্পনা ৳১৩,০০০, বর্তমান ব্যালেন্স ৳১০,০০০। ঘাটতি ৳৩,০০০।

ট্যাপ করলে budget, unpaid bills ও ঘাটতির breakdown খুলবে।

## ৪. প্রথম অগ্রাধিকার: সতর্কতা ও notification inbox

| নিয়ম | কখন | প্রস্তাবিত আচরণ |
| --- | --- | --- |
| বাজেট ৮০% / ৯০% | net spending threshold পার হলে | category, শতাংশ, বাকি টাকা; মাসে threshold-পিছু একবার |
| বাজেট ১০০% / অতিক্রম | limit পৌঁছালে বা ছাড়ালে | শেষ/অতিরিক্ত খরচের পৃথক ভাষা; budget detail খুলবে |
| বাজেটের তুলনায় টাকা কম | নতুন ঘাটতি দেখা দিলে | নির্দিষ্ট ঘাটতি ও কারণ; ঘাটতি মিটলে active warning সরবে |
| account low balance | user-set সীমার নিচে নামলে | account-পিছু configurable; টাকা যোগ হলে state clear |
| bill due | শুরুতে ৩ দিন আগে, ১ দিন আগে, due day | সময় নির্বাচন, paid হলে pending reminders cancel |
| overdue bill | due date পার হলে | inbox-এ active warning; প্রতিদিন push নয়, নির্বাচিত digest |
| দৈনিক হিসাব | রাত ৮টা, দিন complete না হলে | একবার; user snooze করলে একটি পরের reminder |

Spam control:

- একটি transaction-এ ৮০% থেকে ১০৫% হলে সর্বোচ্চ প্রযোজ্য threshold-এর একটি notification; তিনটি একসঙ্গে নয়।
- budget threshold key হবে budget + month + level। Edit/reversal-এর পর একই level পুনরায় পার হলেও ওই মাসে একই push আবার নয়; inbox-এর বর্তমান অবস্থা ঠিক হবে।
- ঘাটতি ও account-low alerts state transition-এ আসবে; persistent অবস্থায় দিনে সর্বোচ্চ একটি grouped reminder। Default non-daily push cap: প্রতিদিন ৩টি; অতিরিক্তগুলো inbox-এ থাকবে। Daily reminder এবং স্পষ্ট user snooze আলাদা।
- default quiet hours রাত ১০টা–সকাল ৮টা। Deferred alerts delivery-র আগে app চললে condition আবার যাচাই হবে; remote revalidation না থাকলে private generic copy ব্যবহার হবে।
- notification inbox: unread/read, active/resolved, date grouping এবং actionable destination। OS notification dismiss করা মানে bill paid বা হিসাব complete নয়।
- lock screen-এ default শুধু **হিসাবের একটি আপডেট আছে**; amount/account/person name দেখানো আলাদা opt-in। App খোলার পর বিস্তারিত।
- category-পিছু enable/disable; daily/budget/bill/account controls স্বাধীন। Bill reminders বন্ধ করতে গিয়ে daily reminder cancel করা যাবে না।

## ৫. দ্বিতীয় অগ্রাধিকার: আরও দরকারি ঘাটতি

| সংযোজন | ব্যবহারকারীর লাভ | শর্ত/সীমা |
| --- | --- | --- |
| আগামী ৭/৩০ দিনের cash-flow calendar | কোন দিনে টাকা কমতে পারে বোঝা | actual ও expected আলাদা; সময়সীমার বাইরে দায় বাদ |
| Spending pace | মাসের অর্ধেক সময়েই বেশি budget শেষ হচ্ছে কি না | পর্যাপ্ত recorded data থাকলে projection, নিশ্চয়তা নয় |
| Weekly / month-end summary | আয়, খরচ, বড় category, budget variance | default push-এ private wording; বিস্তারিত app-এ |
| মাসের শুরুতে budget review | আগের মাস copy/rollover review সহজ | existing copy/rollover-এর ওপর reminder ও preview |
| Savings funding view | earmarked টাকা আসলেই আছে কি না | account allocation, over-allocation warning; balance double-count নয় |
| Encrypted draft recovery | অসমাপ্ত এন্ট্রি হারানো কমানো | এখন unsaved-exit guard আছে; durable draft আলাদা কাজ |
| Refund, split expense ও fees | বাস্তব লেনদেন বেশি নির্ভুল | বিদ্যমান reversal/correction flow বজায় রেখে |
| Account reconciliation | বাস্তব wallet/bank balance-এর অমিল ধরা | existing statement-এর ওপর explicit adjustment ও audit trail |
| Backup health | শেষ manual backup কবে হয়েছে বোঝা | নিজে reminder; সংবেদনশীল backup কোথাও স্বয়ংক্রিয় upload নয় |
| Sync health | pending/conflict/expired login সহজে বোঝা | পুরোনো sync failure বারবার push নয় |
| সম্পূর্ণ বাংলা ও accessibility | settings, alerts, error সব ব্যবহারযোগ্য | বড় font, screen reader, বাংলা অঙ্ক/তারিখ review |

## ৬. তৃতীয় অগ্রাধিকার

- তারিখভিত্তিক loan installment schedule ও interest/fees model; এর পরে EMI alerts ও repayment timeline। বর্তমান mobile model শুধু principal tracker।
- salary/recurring income expectation, missed-income reminder এবং forecast comparison; expected entry-কে auto received করা হবে না।
- recurring bills-এর custom frequency ও partial payment, যদি product scope-এ নেওয়া হয়।
- একাধিক ডিভাইসে daily completion sync, notification ownership ও duplicate কমানো; offline অবস্থায় সব ডিভাইসের duplicate পুরোপুরি বন্ধের প্রতিশ্রুতি নয়।
- ওয়েব notification center ও প্রয়োজনে web push/server scheduler। আগে mobile/web finance data integration-এর সিদ্ধান্ত প্রয়োজন।

## ৭. বাস্তবায়নের ক্রম

### ধাপ ১ — হিসাবের নিয়ম ও data model

- reusable `BudgetHealth`/obligation calculation; clock/timezone injectable।
- bill → category/budget link ও scheduled transaction identity; পুরোনো unlinked bill review করানোর ব্যবস্থা।
- daily completion record, per-device notification preferences, alert history/dedupe state আলাদা সংরক্ষণ।
- completion-এর local storage প্রথমে; cross-device sync পরে। Preference/history restore policy ও schema migration নির্দিষ্ট করতে হবে। Restore-এর সময় পুরোনো scheduled notifications cancel/rebuild হবে; অন্য ফোনের OS permission state restore হবে না।

### ধাপ ২ — দৈনিক reminder ও Dashboard

- রাত ৮টার reminder, দুই mode, হিসাব শেষ/লেনদেন নেই, snooze এবং permission status।
- notification routing, lock-aware actions এবং অসম্পূর্ণ দিনের review।
- balance, remaining plan, shortage ও breakdown cards।

### ধাপ ৩ — alerts ও controls

- threshold events, low-balance/shortage events, enhanced bill scheduling।
- shared notification scheduler: stable namespaced IDs, serialization, category-specific cancellation, quota allocation।
- inbox, dedupe, daily cap, quiet hours, settings ও bilingual messages।

### ধাপ ৪ — যাচাই ও নতুন build

- financial rule tests + reminder planning tests + গুরুত্বপূর্ণ UI flows।
- বাস্তব Android/iPhone-এ notification delivery ও lifecycle যাচাই।
- তারপর signed Android build এবং উপলব্ধ iOS build pipeline দিয়ে review artifacts। Planning document লেখা বা unit test pass করাকে device delivery যাচাই বলা যাবে না।

প্রতিটি ধাপের আগে আগের ধাপের প্রয়োজনীয় হিসাব ও আচরণ যাচাই শেষ করতে হবে। এই পরিকল্পনায় release deadline নির্ধারিত হয়নি।

## ৮. কাজ সম্পূর্ণ বলার শর্ত

- [ ] অসম্পূর্ণ দিন: রাত ৮টার লক্ষ্য সময়ের reminder আসে; complete/no-transaction দিন: ওই দিনের reminder বাতিল।
- [ ] আজকের entry, backdated entry, future entry এবং reversal সঠিকভাবে আলাদা হয়।
- [ ] ৮টার পরে complete করলে ইতিমধ্যে delivered notification/inbox-ও reconcile হয়; পুরোনো দিনের action নতুন দিন complete করে না।
- [ ] মাস বদল, leap day, timezone/time change এবং app বহুদিন না খোলার behavior নির্ধারিত ও tested।
- [ ] একই bill budget ও forecast-এ দুবার গণনা হয় না; paid/reversed/edited/deleted bill সঙ্গে সঙ্গে reconcile হয়।
- [ ] transfers, principal repayments, goals এবং reserved accounts balance/budget-এ double-count হয় না।
- [ ] একই threshold পুনরায় notification দেয় না; jump করলে শুধু সর্বোচ্চ level আসে।
- [ ] daily reminder বন্ধ করলে bill reminders থাকে; permission না থাকলেও app-এর হিসাব ও inbox ব্যবহার করা যায়।
- [ ] offline, app closed, reboot, battery saver, permission revoke, restore, sync conflict এবং foreground midnight বাস্তব supported devices-এ যাচাই। OS force-stop এবং সাধারণ app close-এর ফল আলাদা করে নথিভুক্ত।
- [ ] notification ট্যাপ app lock পার হয়ে সঠিক screen/space খুলে; deleted record হলে নিরাপদ fallback দেখায়।
- [ ] বাংলা/English, বড় font ও hidden balances ঠিক থাকে; lock screen-এ private তথ্য default-এ প্রকাশ হয় না।

## ৯. প্ল্যাটফর্ম সংক্রান্ত সূত্র

Android-এর inexact alarm battery/OS restrictions অনুসারে দেরিতে আসতে পারে; exact alarm-এর আলাদা access এবং ব্যবহারসংক্রান্ত শর্ত আছে। রাত ৮টাকে লক্ষ্য সময় ধরে default inexact local reminder দিয়ে শুরু করা হবে। মিনিট-নির্ভুল delivery-কে পরীক্ষাবিহীন প্রতিশ্রুতি করা হবে না। [Android alarm scheduling](https://developer.android.com/develop/background-work/services/alarms)।

iOS local scheduling-এর ভিত্তি: [Apple local notification documentation](https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app)।
