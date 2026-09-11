# 计算机部招新 C语言 题组

## 前言

### 致新生：

招新材料包含两份题库（C语言/Python）和五道算法挑战题。

选填题库面试时会按你的主语言抽题提问；挑战题在洛谷团队比赛，自愿参加，可用 C 或 Python。

挑战题需要在洛谷上完成，做的同学都需要注册一个洛谷账号，有能力的同学可以尝试一下。建议每人至少看一道，面试时能讲清题意、暴力思路和边界即可，不需要完全做出来，可以只拿到部分分数。

基础差一点的同学不用慌乱，挑战题不做不影响面试，我们更看重你的思路与学习能力。

### 附挑战题链接：

在比赛 40届无协招新( https://www.luogu.com.cn/contest/356075 )中，输入邀请码： 6r5f ，加入比赛。

> C语言题组共 18 题：基础 6 题、中档 7 题、困难 5 题
> 以理解本质和学习思路为主，重点考察底层理解和逻辑思维;招新以现场提问为主，围绕这些题目及其衍生问题

## 基础题

### 1. 日常使用的 Windows 属于计算机的哪一类软件？
A. 操作系统 B. 办公软件 C. 游戏软件 D. 杀毒软件

### 2. 下列字符串中，可以作为 C 语言合法标识符的是？
A. 123abc B. a+b C. _count D. int

### 3. C 语言中，字符常量 '5' 的数据类型是？
A. int B. char C. float D. double

### 4. 找出下面代码中的错误，并说明修改方法。代码本意是输入一个整数，输出它的平方。

```c
#include <stdio.h>
int main() {
    int n;
    scanf("%d", n);
    printf("%d", n * n);
    return 0;
}
```

### 5. 写出下面程序的输出结果。

```c
#include <stdio.h>
int main() {
    int sum = 0;
    for (int i = 1; i <= 5; i++) {
        sum += i;
    }
    printf("%d", sum);
    return 0;
}
```

### 6. 判断对错并简单说明理由：C 语言程序必须经过编译、链接后才能运行。

## 中档题

### 7. 表达式 `3 + 12 / 3 * 2` 的计算结果是多少？请说明运算顺序。

### 8. 直角三角形两条直角边为整型变量 `a`、`b`，以下哪个表达式能正确计算面积？并说明其他选项错误的原因。
A. `a * b / 2` B. `1 / 2 * a * b` C. `a / 2 * b` D. `a * b / 2.0`

### 9. 写出下面程序的输出结果，并解释原因。

```c
#include <stdio.h>
int main() {
    int arr[5] = {10, 20, 30, 40, 50};
    printf("%d", arr[3]);
    return 0;
}
```

### 10. 写出程序执行后 `a`、`b`、`c` 的值，并说明逻辑运算符的执行特性。

```c
#include <stdio.h>
int main() {
    int a = 0, b = 1, c = 2;
    if (a++ && b++ || c++) {}
    printf("a=%d b=%d c=%d", a, b, c);
    return 0;
}
```

### 11. 写出下面程序的输出结果，并说明两个 `x` 的区别。

```c
#include <stdio.h>
int x = 10;
void test() {
    int x = 5;
    printf("%d ", x);
}
int main() {
    test();
    printf("%d", x);
    return 0;
}
```

### 12. 写出两个 `printf` 的输出结果，并说明两者数值不同的原因。

```c
#include <stdio.h>
#include <string.h>
int main() {
    char s[] = "coder";
    printf("%zu ", sizeof(s));
    printf("%zu", strlen(s));
    return 0;
}
```

### 13. 判断以下说法是否正确并说明理由：能用 `while` 实现的循环，都可以用 `for` 循环实现。

## 困难题

### 14. 写出下面程序的输出结果，并解释指针是如何改变变量值的。

```c
#include <stdio.h>
int main() {
    int num = 10;
    int *p = &num
    *p = 25;
    printf("%d", num);
    return 0;
}
```

### 15. 下面的 `swap` 函数本意是交换两个整数的值，请问能否实现功能？为什么？如果不能，请写出修改思路。

```c
#include <stdio.h>
void swap(int x, int y) {
    int tmp = x;
    x = y;
    y = tmp;
}
int main() {
    int a = 10, b = 20;
    swap(a, b);
    printf("a=%d b=%d", a, b);
    return 0;
}
```

### 16. 写出下面程序的输出结果，并解释 `if` 条件的实际运算逻辑。

```c
#include <stdio.h>
int main() {
    int sum = 1;
    for (int i = 1; i <= 10; i++)
        if (3 <= i <= 5)
            sum += i;
    printf("%d", sum);
    return 0;
}
```

### 17. 补全代码，使程序输出数组中的最小值，以及它第一次出现的下标。示例数组应输出 `-9 2`。

```c
#include <stdio.h>
int main() {
    int arr[] = {-5, -2, -9, -2, -7};
    int len = sizeof(arr) / sizeof(arr[0]);
    int min_val = ______;
    int min_idx = ______;
    for (int i = 1; i < len; i++) {
        if (______) {
            ______;
            ______;
        }
    }
    printf("%d %d", min_val, min_idx);
    return 0;
}
```

### 18. 补全代码，统计字符串中小写英文字母的个数，示例字符串应输出 `8`。

```c
#include <stdio.h>
int main() {
    char str[] = "Hello C World";
    int count = 0;
    for (int i = 0; ______; i++) {
        if (______) {
            count++;
        }
    }
    printf("%d", count);
    return 0;
}
