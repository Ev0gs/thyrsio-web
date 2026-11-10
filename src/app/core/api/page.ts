/** Une page de résultats, telle que l'API la renvoie (Spring Data, sérialisation VIA_DTO). */
export interface Page<T> {
  content: T[];
  page: {
    size: number;
    number: number;
    totalElements: number;
    totalPages: number;
  };
}
