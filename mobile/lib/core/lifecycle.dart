/// Synchronous barrier for work started by an older vault/session.
class VaultLifecycle {
  int generation = 0;
  final Set<void Function()> _listeners = {};
  void Function() listen(void Function() listener) {
    _listeners.add(listener);
    return () => _listeners.remove(listener);
  }

  void invalidate() {
    generation++;
    for (final listener in List.of(_listeners)) {
      listener();
    }
  }
}
