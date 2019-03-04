// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

let c = 0;
export default typeof WeakMap === 'function' ?
  WeakMap :
  function () {
    const id = typeof Symbol === 'function' ? Symbol(0) : `__weak$${++c}`;
    this.set = (key, val) => {
      key[id] = val;
    };
    this.get = key => key[id];
  };
