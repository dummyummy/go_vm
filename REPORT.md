**Heap Memory Management: Computational and Mathematical Framework**

Heap memory management is a computational process that dynamically allocates and deallocates memory chunks to programs at runtime. Here’s a more formalized approach to the algorithm:

1. **Heap Initialization**: Let \( H \) be a finite, ordered set representing the heap. The heap is partitioned into two subsets, \( H_{alloc} \) and \( H_{free} \), such that \( H = H_{alloc} \cup H_{free} \) and \( H_{alloc} \cap H_{free} = \emptyset \). These subsets represent allocated and free memory blocks, respectively.

2. **Memory Allocation**: Define an allocation function \( \alpha : S \times H_{free} \rightarrow H_{alloc} \times H_{free}' \) where \( S \) is the set of requested sizes and \( H_{free}' \) is the modified free memory after allocation. The function \( \alpha \) maps a requested size and the current free memory to a newly allocated block and the updated free memory.

3. **Garbage Collection**: The garbage collector is a function \( \gamma : H_{alloc} \rightarrow H_{free} \), which identifies and moves unreachable memory blocks from \( H_{alloc} \) to \( H_{free} \).

4. **Deallocation and Coalescing**: Deallocation is defined by the inverse of \( \alpha \), \( \alpha^{-1} : H_{alloc} \rightarrow H_{free} \). The coalescing process is a function \( \kappa : P(H_{free}) \rightarrow H_{free} \), where \( P(H_{free}) \) is the power set of \( H_{free} \). It merges adjacent free memory blocks to form larger contiguous blocks in \( H_{free} \).

5. **Resizing**: The heap can be considered a dynamic array that can be resized, which is a function \( \rho : H \times N \rightarrow H' \), where \( N \) is the set of natural numbers representing the new size of the heap, and \( H' \) is the resultant heap. This function ensures that \( |H'| = n \) for some \( n \in N \) while maintaining the existing order of memory blocks.

Mathematically, heap memory management is about optimizing the utilization of \( H \) under the constraints of \( H_{alloc} \) and \( H_{free} \), and the operations \( \alpha, \gamma, \alpha^{-1} \), and \( \kappa \) to ensure that the memory is utilized efficiently, fragmentation is minimized, and the system performance is maximized. The ultimate goal is to satisfy memory requests while ensuring that \( \forall h \in H_{alloc}, \exists! \, s \in S \) such that \( \alpha(s, H_{free}) = h \) and that for any given time, the sum of all sizes of \( H_{alloc} \) and \( H_{free} \) equals the total size of \( H \).
