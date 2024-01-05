import React, { useState } from "react";

function useArrows() {
  const [w, set_w] = useState(false);
  const [a, set_a] = useState(false);
  const [s, set_s] = useState(false);
  const [d, set_d] = useState(false);

  const handle_keypress = (arrow, value) => {
    if (arrow === "w") {
      set_w(value);
    } else if (arrow === "a") {
      set_a(value);
    } else if (arrow === "s") {
      set_s(value);
    } else if (arrow === "d") {
      set_d(value);
    }
  };

  return {
    w,
    a,
    s,
    d,
    handle_keypress,
  };
}

export default useArrows;
