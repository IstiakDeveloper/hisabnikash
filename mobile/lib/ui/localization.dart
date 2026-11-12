import 'package:flutter/widgets.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../app/providers.dart';
import '../core/localization.dart';
export '../core/localization.dart';

String localText(BuildContext context, String english) {
  try {
    final container = ProviderScope.containerOf(context, listen: false);
    return container.read(languageProvider) == 'bn'
        ? translateText(english, language: 'bn')
        : english;
  } catch (_) {
    return english;
  }
}

class LText extends StatelessWidget {
  const LText(this.data,
      {super.key,
      this.style,
      this.textAlign,
      this.maxLines,
      this.overflow,
      this.softWrap,
      this.semanticsLabel});
  final String data;
  final TextStyle? style;
  final TextAlign? textAlign;
  final int? maxLines;
  final TextOverflow? overflow;
  final bool? softWrap;
  final String? semanticsLabel;
  @override
  Widget build(BuildContext context) {
    Localizations.maybeLocaleOf(context);
    return Text(localText(context, data),
        style: style,
        textAlign: textAlign,
        maxLines: maxLines,
        overflow: overflow,
        softWrap: softWrap,
        semanticsLabel: semanticsLabel);
  }
}
