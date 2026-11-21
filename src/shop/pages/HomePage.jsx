import useTitle from '../useTitle';
import AfsanaSignatureHome from '../AfsanaSignatureHome';

export default function HomePage(){
  useTitle('AFSANA Perfumes Pakistan | Luxury Fragrances');
  return <div data-afsana-home><AfsanaSignatureHome/></div>;
}
