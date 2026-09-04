# 计算机部招新 Python 题组

> 共 15 题：基础 3 题、提高 8 题、压轴 4 题。重点考察代码理解、Python 基础和解决问题的思路，不要求死记偏门语法。

## 基础题

### 1. input() 与类型转换

下面程序本意是输入年龄并判断是否成年。它有什么问题？应如何修改？

```python
age = input()

if age >= 18:
    print("adult")
else:
    print("minor")
```

### 2. 循环、条件与累加

写出最终输出，并说明循环在做什么。

```python
total = 0

for i in range(1, 6):
    if i % 2 == 0:
        total += i

print(total)
```

### 3. return 和 print

写出程序输出，并解释最后一行为什么是这个结果。

```python
def double(x):
    print(x * 2)

y = double(3)
print(y)
```

## 提高题

### 4. 列表引用与别名

写出两行输出，并解释为什么。

```python
a = [1, 2, 3]
b = a
b.append(4)

print(a)
print(b)
```

### 5. 列表推导式

写出输出，并用普通 for 循环说明等价逻辑。

```python
nums = [1, 2, 3, 4, 5, 6]
result = [x * x for x in nums if x % 2 == 0]

print(result)
```

### 6. 用字典统计频次

写出最终输出，并说明 `get` 的作用。

```python
text = "abacaba"
count = {}

for ch in text:
    count[ch] = count.get(ch, 0) + 1

print(count)
```

### 7. set 的用途

写出结果，并说明 set 适合解决什么问题。

```python
nums = [3, 1, 3, 2, 1, 4]
unique = set(nums)

print(len(unique))
```

### 8. 局部变量与全局变量

写出输出，并解释两个 x 的关系。

```python
x = 10

def f():
    x = 5
    print(x)

f()
print(x)
```

### 9. sorted() 与 list.sort()

写出输出，并说明 `sorted()` 与 `list.sort()` 的区别。

```python
a = [3, 1, 2]
b = sorted(a)

print(a)
print(b)
```

### 10. 遍历时修改列表

程序想删除所有的 2。它能正确实现吗？为什么？

```python
nums = [1, 2, 2, 2, 3]

for x in nums:
    if x == 2:
        nums.remove(x)

print(nums)
```

### 11. 异常处理

分别说明输入 `abc`、`0`、`2` 时程序会发生什么。

```python
try:
    n = int(input())
    print(10 / n)
except ValueError:
    print("invalid number")
except ZeroDivisionError:
    print("cannot divide by zero")
```

## 压轴题

### 12. 可变默认参数

判断两行输出，并解释为什么。

```python
def add_item(item, bucket=[]):
    bucket.append(item)
    return bucket

print(add_item(1))
print(add_item(2))
```

### 13. 浅拷贝与嵌套列表

写出 `print(a)` 的结果，并解释为什么 a 也发生变化。

```python
a = [[1, 2], [3, 4]]
b = a.copy()

b[0][0] = 99
print(a)
```

### 14. 补全代码：最大值及其下标

补全代码，使程序输出最大值及其第一次出现的下标。给定列表应输出 `-2 1`。

```python
nums = [-5, -2, -9, -2]

max_num = ______
max_index = ______

for i in range(1, len(nums)):
    if ______:
        ______
        ______

print(max_num, max_index)
```

### 15. 补全代码：统计及格学生与平均分

补全代码：把成绩不低于 60 的学生姓名加入 passed，同时计算全体学生平均分。

```python
scores = {
    "Alice": 82,
    "Bob": 59,
    "Carol": 91,
    "David": 68
}

passed = []
total = 0

for name, score in ______:
    total += ______
    if ______:
        ______

average = ______ if scores else 0

print(passed)
print(average)
```
