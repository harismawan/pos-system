export function createMockFn(impl = () => undefined) {
  const fn = (...args) => {
    fn.calls.push(args);
    return impl(...args);
  };

  fn.calls = [];

  fn.mockImplementation = (newImpl) => {
    impl = newImpl;
  };

  fn.mockReturnValue = (value) => {
    impl = () => value;
  };

  fn.mockResolvedValue = (value) => {
    impl = async () => value;
  };

  fn.mockReset = () => {
    fn.calls = [];
    impl = () => undefined;
  };

  return fn;
}
