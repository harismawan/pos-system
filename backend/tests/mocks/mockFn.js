export function createMockFn(impl = () => undefined) {
  const fn = (...args) => {
    fn.calls.push(args);
    if (onces.length > 0) {
      const nextImpl = onces.shift();
      return nextImpl(...args);
    }
    return impl(...args);
  };

  fn.calls = [];

  let onces = [];

  fn.mockImplementation = (newImpl) => {
    impl = newImpl;
  };

  fn.mockImplementationOnce = (newImpl) => {
    onces.push(newImpl);
  };

  fn.mockReturnValue = (value) => {
    impl = () => value;
  };

  fn.mockResolvedValue = (value) => {
    impl = async () => value;
  };

  fn.mockResolvedValueOnce = (value) => {
    onces.push(async () => value);
    return fn;
  };

  fn.mockRejectedValue = (error) => {
    impl = async () => {
      throw error;
    };
  };

  fn.mockReset = () => {
    fn.calls = [];
    onces = [];
    impl = () => undefined;
  };

  return fn;
}
