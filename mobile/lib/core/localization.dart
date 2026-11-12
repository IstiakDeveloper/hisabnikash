import 'localization_catalog.dart';
import 'localization_remaining.dart';

final translationsBn = <String, String>{
  ...banglaMessages,
  ...remainingBangla,
  'transaction': 'লেনদেন',
  'account': 'অ্যাকাউন্ট',
  'budget': 'বাজেট',
  'bill': 'বিল',
  'goal': 'লক্ষ্য',
  'loan': 'ঋণ',
  'space': 'হিসাব',
  'category': 'ক্যাটাগরি',
  'date': 'তারিখ',
  'due': 'পরিশোধের তারিখ',
  'name': 'নাম',
  'type': 'ধরন',
  'amount': 'টাকা',
  'opening': 'শুরুর ব্যালেন্স',
  'saved': 'বরাদ্দ টাকা',
  'target': 'লক্ষ্য',
  'principal': 'মূল টাকা',
  'interest': 'সুদ',
  'repaid': 'পরিশোধ',
  'fee': 'ফি',
  'month': 'মাস',
  'destination': 'প্রাপকের অ্যাকাউন্ট',
  'frequency': 'পুনরাবৃত্তি',
  'direction': 'ঋণের ধরন',
  'note': 'নোট',
  'paid': 'পরিশোধের অবস্থা',
  'active': 'চলমান অবস্থা',
  'archived': 'আর্কাইভের অবস্থা',
  'backingAccount': 'সঞ্চয়ের অ্যাকাউন্ট',
  'scheduleId': 'পুনরাবৃত্তির সময়সূচি',
  'categoryId': 'ক্যাটাগরি',
  'reversalOf': 'মূল লেনদেন',
  'originalType': 'মূল ধরন',
  'series': 'ধারাবাহিক বিল',
  'cycle': 'পর্ব',
  'startDate': 'শুরুর তারিখ',
  'installment': 'কিস্তি',
  'invoice': 'ইনভয়েস',
  'party': 'যোগাযোগ',
  'expectation': 'প্রত্যাশিত আয়',
  'template': 'ছক',
  'fingerprint': 'পর্যালোচনার পরিচয়',
  'contact': 'যোগাযোগ',
  'refundOf': 'মূল খরচ',
  'lowBalance': 'কম ব্যালেন্সের সীমা',
  'income': 'আয়',
  'expense': 'খরচ',
  'transfer': 'স্থানান্তর',
  'debt_payment': 'ঋণ পরিশোধ',
  'debt_collection': 'ঋণ আদায়',
  'refund': 'ফেরত টাকা',
  'reversal': 'বিপরীত এন্ট্রি',
  'Net cash flow': 'মোট নগদ প্রবাহ',
  'Income': 'আয়',
  'Expenses': 'খরচ',
  'Balance adjustments': 'ব্যালেন্স সমন্বয়',
  'Due': 'পরিশোধের তারিখ',
  'Total': 'মোট',
  'Outstanding': 'বকেয়া',
  'Budget': 'বাজেট',
  'Actual': 'প্রকৃত',
  'Account': 'অ্যাকাউন্ট',
  'To': 'যে অ্যাকাউন্টে',
  'Balance': 'ব্যালেন্স',
  'Opening balance': 'শুরুর ব্যালেন্স',
  'Current balance': 'বর্তমান ব্যালেন্স',
  'Loan repayments': 'ঋণ পরিশোধ',
  'Loan collections': 'ঋণ আদায়',
};

String banglaDigits(Object value) {
  const digits = '০১২৩৪৫৬৭৮৯';
  return value
      .toString()
      .replaceAllMapped(RegExp(r'[0-9]'), (m) => digits[int.parse(m[0]!)]);
}

String translateText(String value, {String language = 'en'}) {
  if (language != 'bn' || value.isEmpty) return value;
  final exact = translationsBn[value];
  if (exact != null) return exact;
  String t(String s) => translateText(s, language: language);
  String field(String s) => translationsBn[s] ?? s;
  final lower = value.toLowerCase();
  if (value == value.toUpperCase() && translationsBn.containsKey(lower)) {
    return translationsBn[lower]!;
  }
  Match? m;
  if ((m = RegExp(r'^(Add|Edit|Save) (\w+)$').firstMatch(value)) != null) {
    final kind = field(m![2]!);
    return '$kind ${m[1] == 'Add' ? 'যোগ করুন' : m[1] == 'Edit' ? 'পরিবর্তন করুন' : 'সংরক্ষণ করুন'}';
  }
  if ((m = RegExp(r'^Delete (\w+)\?$').firstMatch(value)) != null) {
    return '${field(m![1]!)} মুছবেন?';
  }
  if ((m = RegExp(r'^([A-Za-z]+) saved on this device$').firstMatch(value)) !=
      null) return '${field(m![1]!.toLowerCase())} এই ডিভাইসে সংরক্ষিত';
  if ((m = RegExp(r'^(?:A valid |Enter a valid )(.+?)(?: is required\.|\.)$')
          .firstMatch(value)) !=
      null) return 'সঠিক ${field(m![1]!)} দিন।';
  if ((m = RegExp(r'^Invalid (.+?)(?: (amount|date))?\.$').firstMatch(value)) !=
      null) {
    return '${field(m![1]!)}${m[2] == null ? '' : m[2] == 'amount' ? ' টাকার পরিমাণ' : ' তারিখ'} সঠিক নয়।';
  }
  if ((m = RegExp(r'^Choose a valid (.+?)( in this space)?\.$')
          .firstMatch(value)) !=
      null) {
    return '${m![2] != null ? 'এই হিসাবে ' : ''}সঠিক ${field(m[1]!)} বেছে নিন।';
  }
  if ((m = RegExp(r'^Select (.+)$').firstMatch(value)) != null) {
    return '${field(m![1]!)} বেছে নিন';
  }
  if ((m = RegExp(
              r'^(\d+) (transactions|accounts|changes queued|conflicts need review|conflicts need review\.|budgets copied|budgets copied with unspent money)$')
          .firstMatch(value)) !=
      null) {
    final labels = {
      'transactions': 'টি লেনদেন',
      'accounts': 'টি অ্যাকাউন্ট',
      'changes queued': 'টি পরিবর্তন সিঙ্কের অপেক্ষায়',
      'conflicts need review': 'টি অমিল পর্যালোচনা করতে হবে',
      'conflicts need review.': 'টি অমিল পর্যালোচনা করতে হবে।',
      'budgets copied': 'টি বাজেট কপি হয়েছে',
      'budgets copied with unspent money': 'টি বাজেট অবশিষ্ট টাকাসহ কপি হয়েছে'
    };
    return '${banglaDigits(m![1]!)}${labels[m[2]]}';
  }
  if ((m = RegExp(r'^(\d+) changes still queued\. Sync again to continue\.$')
          .firstMatch(value)) !=
      null) {
    return '${banglaDigits(m![1]!)}টি পরিবর্তন অপেক্ষায় আছে। এগোতে আবার সিঙ্ক করুন।';
  }
  if ((m = RegExp(r'^(\d+)% (used|saved)$').firstMatch(value)) != null) {
    return '${banglaDigits(m![1]!)}% ${m[2] == 'used' ? 'খরচ হয়েছে' : 'জমেছে'}';
  }
  if ((m = RegExp(r'^(.+) spent · (.+) left$').firstMatch(value)) != null) {
    return '${m![1]} খরচ · ${m[2]} বাকি';
  }
  if ((m = RegExp(r'^(.+) of (.+)$').firstMatch(value)) != null) {
    return '${m![2]}-এর মধ্যে ${m[1]}';
  }
  if ((m = RegExp(r'^(.+) (remaining|repaid|overpaid · review payments)$')
          .firstMatch(value)) !=
      null) {
    return '${m![1]} ${m[2] == 'remaining' ? 'বাকি' : m[2] == 'repaid' ? 'পরিশোধ' : 'বেশি পরিশোধ · মিলিয়ে নিন'}';
  }
  if ((m = RegExp(
              r'^(Balance|Account|To|Opening balance|Current balance|Income|Expenses|Net cash flow|Loan repayments|Loan collections|Balance adjustments|Due|Total|Paid|Outstanding|Budget|Actual)(?: BDT)?(?::| ) (.+)$')
          .firstMatch(value)) !=
      null) return '${t(m![1]!)}: ${m[2]}';
  if ((m = RegExp(r'^Balance (.+)$').firstMatch(value)) != null) {
    return 'ব্যালেন্স ${m![1]}';
  }
  if ((m = RegExp(
              r'^Scheduled for (.+)\. Current balances and actual spending will change on that date\.$')
          .firstMatch(value)) !=
      null) {
    return '${m![1]} তারিখে নির্ধারিত। সেই তারিখে বর্তমান ব্যালেন্স ও প্রকৃত খরচ বদলাবে।';
  }
  if ((m = RegExp(
              r'^This backup contains (\d+) records\. Your current vault will be replaced\. Export a current backup first if you need to keep it\.$')
          .firstMatch(value)) !=
      null) {
    return 'এই ব্যাকআপে ${banglaDigits(m![1]!)}টি তথ্য আছে। বর্তমান তথ্যভান্ডার বদলানো হবে। বর্তমান তথ্য রাখতে আগে ব্যাকআপ নিন।';
  }
  if ((m = RegExp(r'^Recorded \+(.+) / (.+)$').firstMatch(value)) != null) {
    return 'লেখা হয়েছে +${m![1]} / ${m[2]}';
  }
  if (value.contains(' · ')) return value.split(' · ').map(t).join(' · ');
  if (value.contains('\n')) return value.split('\n').map(t).join('\n');
  if (value.startsWith('Reversal (') && value.endsWith(')')) {
    return 'বিপরীত এন্ট্রি (${t(value.substring(10, value.length - 1))})';
  }
  return value;
}
